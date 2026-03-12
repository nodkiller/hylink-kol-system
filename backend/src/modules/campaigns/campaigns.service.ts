import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignKol } from './entities/campaign-kol.entity';
import { Kol } from '../kols/entities/kol.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { AddKolsToCampaignDto } from './dto/add-kols-to-campaign.dto';
import { UpdateCampaignKolDto } from './dto/update-campaign-kol.dto';
import { CampaignKolStatus } from '../../common/enums';
import { CampaignKolPost } from './entities/campaign-kol-post.entity';
import { CreateCampaignKolPostDto } from './dto/create-campaign-kol-post.dto';
import { UpdateCampaignKolPostDto } from './dto/update-campaign-kol-post.dto';

// ─── Response Types ────────────────────────────────────────────────────────────

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedCampaigns {
  data: Campaign[];
  meta: PaginationMeta;
}

export interface AddKolsResult {
  added: CampaignKol[];
  alreadyInCampaign: string[];      // kolIds already present
  notFound: string[];               // kolIds that don't exist in DB
  blacklisted: { id: string; name: string }[]; // blocked from being added
}

// ─── Tracking code generator ───────────────────────────────────────────────────

function generateTrackingCode(campaignName: string, kolName: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug(campaignName)}-${slug(kolName)}-${rand}`;
}

// ─── Sort field whitelist ──────────────────────────────────────────────────────

const CAMPAIGN_SORT_FIELDS: Record<string, string> = {
  name: 'campaign.name',
  client_name: 'campaign.clientName',
  status: 'campaign.status',
  created_at: 'campaign.createdAt',
  start_date: 'campaign.startDate',
};

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,

    @InjectRepository(CampaignKol)
    private readonly campaignKolRepo: Repository<CampaignKol>,

    @InjectRepository(CampaignKolPost)
    private readonly postRepo: Repository<CampaignKolPost>,

    private readonly dataSource: DataSource,
  ) {}

  // ─── Campaign CRUD ──────────────────────────────────────────────────────────

  /** Set or clear the client portal password. */
  async updatePortalPassword(id: string, password: string | null): Promise<Campaign> {
    await this.findOne(id);
    await this.campaignRepo.update(id, { clientPortalPassword: password as unknown as string });
    return this.findOne(id);
  }

  async create(dto: CreateCampaignDto, createdById: string): Promise<Campaign> {
    const campaign = this.campaignRepo.create({ ...dto, createdById });
    const saved = await this.campaignRepo.save(campaign);

    return this.findOne(saved.id);
  }

  async findAll(query: CampaignQueryDto): Promise<PaginatedCampaigns> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC',
    } = query;

    const skip = (page - 1) * limit;
    const sortField = CAMPAIGN_SORT_FIELDS[sortBy] ?? 'campaign.createdAt';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.buildCampaignFilterQuery(query);

    const total = await qb.getCount();

    const data = await this.buildCampaignFilterQuery(query)
      .leftJoinAndSelect('campaign.createdBy', 'creator')
      // Embed KOL count per campaign without loading all KOL data
      .loadRelationCountAndMap(
        'campaign.kolCount',
        'campaign.campaignKols',
      )
      .orderBy(sortField, sortOrder)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.createdBy', 'creator')
      // Count KOLs grouped by status — loaded as a virtual map in JS below
      .where('campaign.id = :id', { id })
      .getOne();

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID "${id}" not found`);
    }

    // Append KOL status summary (e.g. { Shortlisted: 3, Contracted: 1 })
    const statusSummary = await this.campaignKolRepo
      .createQueryBuilder('ck')
      .select('ck.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ck.campaignId = :id', { id })
      .groupBy('ck.status')
      .getRawMany<{ status: CampaignKolStatus; count: string }>();

    (campaign as any).kolStatusSummary = Object.fromEntries(
      statusSummary.map((r) => [r.status, parseInt(r.count, 10)]),
    );
    (campaign as any).kolTotal = statusSummary.reduce(
      (sum, r) => sum + parseInt(r.count, 10),
      0,
    );

    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    await this.findOne(id); // throws 404 if not found

    const definedData = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );

    if (Object.keys(definedData).length > 0) {
      await this.campaignRepo.update(id, definedData);
    }

    return this.findOne(id);
  }

  // ─── Campaign-KOL Workflow ──────────────────────────────────────────────────

  /**
   * Add one or more KOLs to a campaign (initial status: Shortlisted).
   *
   * - Blacklisted KOLs are rejected and reported in `blacklisted`.
   * - KOLs already in the campaign are skipped and reported in `alreadyInCampaign`.
   * - Non-existent KOL IDs are reported in `notFound`.
   * - The request does NOT fail if some KOLs are invalid — it processes valid ones.
   */
  async addKols(
    campaignId: string,
    dto: AddKolsToCampaignDto,
  ): Promise<AddKolsResult> {
    await this.findOne(campaignId); // verify campaign exists

    const { kolIds } = dto;

    // 1. Batch-fetch all requested KOLs
    const kolRepo = this.dataSource.getRepository(Kol);
    const foundKols = await kolRepo.findBy({ id: In(kolIds) });
    const foundKolMap = new Map(foundKols.map((k) => [k.id, k]));

    // 2. Categorize each requested ID
    const notFound: string[] = [];
    const blacklisted: { id: string; name: string }[] = [];
    const eligibleKolIds: string[] = [];

    for (const id of kolIds) {
      const kol = foundKolMap.get(id);
      if (!kol) {
        notFound.push(id);
      } else if (kol.isBlacklisted) {
        blacklisted.push({ id: kol.id, name: kol.name });
      } else {
        eligibleKolIds.push(id);
      }
    }

    // 3. Check for existing campaign-KOL records
    const alreadyInCampaign: string[] = [];
    const toCreate: string[] = [];

    if (eligibleKolIds.length > 0) {
      const existing = await this.campaignKolRepo.findBy({
        campaignId,
        kolId: In(eligibleKolIds),
      });
      const existingKolIdSet = new Set(existing.map((ck) => ck.kolId));

      for (const id of eligibleKolIds) {
        if (existingKolIdSet.has(id)) {
          alreadyInCampaign.push(id);
        } else {
          toCreate.push(id);
        }
      }
    }

    // 4. Batch-create new campaign-KOL records
    let added: CampaignKol[] = [];
    if (toCreate.length > 0) {
      const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
      const newRecords = toCreate.map((kolId) => {
        const kol = foundKolMap.get(kolId)!;
        return this.campaignKolRepo.create({
          campaignId,
          kolId,
          status: CampaignKolStatus.SHORTLISTED,
          trackingCode: generateTrackingCode(campaign?.name ?? campaignId, kol.name),
        });
      });
      const savedRecords = await this.campaignKolRepo.save(newRecords);

      // Return records with KOL data populated
      added = await this.campaignKolRepo.find({
        where: { id: In(savedRecords.map((r) => r.id)) },
        relations: ['kol', 'kol.platforms'],
        order: { createdAt: 'ASC' },
      });
    }

    return { added, alreadyInCampaign, notFound, blacklisted };
  }

  /**
   * Get all KOLs in a campaign with their campaign-level status and data.
   * Optionally filter by campaign_kol status.
   */
  async getCampaignKols(
    campaignId: string,
    status?: CampaignKolStatus,
  ): Promise<CampaignKol[]> {
    await this.findOne(campaignId); // verify campaign exists

    const qb = this.campaignKolRepo
      .createQueryBuilder('ck')
      .leftJoinAndSelect('ck.kol', 'kol')
      .leftJoinAndSelect('kol.platforms', 'platform')
      .leftJoinAndSelect('ck.assignedTo', 'assignedTo')
      .where('ck.campaignId = :campaignId', { campaignId });

    if (status) {
      qb.andWhere('ck.status = :status', { status });
    }

    return qb
      .orderBy('ck.status', 'ASC')
      .addOrderBy('ck.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Update a KOL's status and data within a campaign.
   * This is the core workflow endpoint — moves KOLs through the pipeline.
   *
   * statusUpdatedAt is automatically set whenever status changes.
   */
  async updateCampaignKol(
    campaignId: string,
    kolId: string,
    dto: UpdateCampaignKolDto,
  ): Promise<CampaignKol> {
    // Verify the campaign-KOL record exists
    const record = await this.campaignKolRepo.findOne({
      where: { campaignId, kolId },
    });

    if (!record) {
      throw new NotFoundException(
        `KOL "${kolId}" is not associated with campaign "${campaignId}"`,
      );
    }

    // If assignedToId is provided, verify the user exists
    if (dto.assignedToId) {
      const userRepo = this.dataSource.getRepository('users');
      const userExists = await userRepo.findOne({
        where: { id: dto.assignedToId },
      });
      if (!userExists) {
        throw new BadRequestException(
          `User "${dto.assignedToId}" does not exist`,
        );
      }
    }

    // Build the update payload — strip undefined fields
    const { status, ...restDto } = dto;
    const updateData: Record<string, any> = Object.fromEntries(
      Object.entries(restDto).filter(([, v]) => v !== undefined),
    );

    if (status !== undefined) {
      updateData.status = status;
      // Track exactly when the status changed for pipeline analytics
      if (status !== record.status) {
        updateData.statusUpdatedAt = new Date();
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.campaignKolRepo.update({ campaignId, kolId }, updateData);
    }

    // Return the fully-populated updated record
    return (await this.campaignKolRepo.findOne({
      where: { campaignId, kolId },
      relations: ['kol', 'kol.platforms', 'assignedTo'],
    }))!;
  }

  // ─── Campaign KOL Posts ─────────────────────────────────────────────────────

  async getPostsForKol(campaignKolId: string): Promise<CampaignKolPost[]> {
    return this.postRepo.find({
      where: { campaignKolId },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async createPost(campaignKolId: string, dto: CreateCampaignKolPostDto): Promise<CampaignKolPost> {
    const post = this.postRepo.create({ ...dto, campaignKolId });
    return this.postRepo.save(post);
  }

  async updatePost(postId: string, dto: UpdateCampaignKolPostDto): Promise<CampaignKolPost> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post "${postId}" not found`);

    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    await this.postRepo.update(postId, updateData);
    return (await this.postRepo.findOne({ where: { id: postId } }))!;
  }

  async deletePost(postId: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post "${postId}" not found`);
    await this.postRepo.delete(postId);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildCampaignFilterQuery(
    query: CampaignQueryDto,
  ): SelectQueryBuilder<Campaign> {
    const { status, clientName, name } = query;

    const qb = this.campaignRepo.createQueryBuilder('campaign');

    if (status) {
      qb.andWhere('campaign.status = :status', { status });
    }

    if (clientName?.trim()) {
      qb.andWhere('campaign.clientName ILIKE :clientName', {
        clientName: `%${clientName.trim()}%`,
      });
    }

    if (name?.trim()) {
      qb.andWhere('campaign.name ILIKE :name', {
        name: `%${name.trim()}%`,
      });
    }

    return qb;
  }
}
