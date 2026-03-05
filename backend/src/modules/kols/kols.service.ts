import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Kol } from './entities/kol.entity';
import { KolPlatform } from './entities/kol-platform.entity';
import { CreateKolDto } from './dto/create-kol.dto';
import { UpdateKolDto } from './dto/update-kol.dto';
import { KolQueryDto } from './dto/kol-query.dto';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedKols {
  data: Kol[];
  meta: PaginationMeta;
}

// Whitelist of sortable fields (prevents SQL injection)
const SORT_FIELD_MAP: Record<string, string> = {
  name: 'kol.name',
  created_at: 'kol.createdAt',
  updated_at: 'kol.updatedAt',
  collaboration_rating: 'kol.collaborationRating',
  city: 'kol.city',
};

@Injectable()
export class KolsService {
  constructor(
    @InjectRepository(Kol)
    private readonly kolRepo: Repository<Kol>,

    @InjectRepository(KolPlatform)
    private readonly platformRepo: Repository<KolPlatform>,

    private readonly dataSource: DataSource,
  ) {}

  // ─── CREATE ────────────────────────────────────────────────────────────────

  async create(dto: CreateKolDto, createdById: string): Promise<Kol> {
    const { platforms, ...kolData } = dto;

    return this.dataSource.transaction(async (manager) => {
      const kol = manager.create(Kol, { ...kolData, createdById });

      let savedKol: Kol;
      try {
        savedKol = await manager.save(kol);
      } catch (err) {
        if (err.code === '23505') {
          throw new ConflictException('A KOL with this information already exists');
        }
        throw err;
      }

      if (platforms?.length) {
        const platformEntities = platforms.map((p) =>
          manager.create(KolPlatform, { ...p, kolId: savedKol.id }),
        );
        await manager.save(KolPlatform, platformEntities);
      }

      // Re-fetch with relations for the response
      return manager.findOne(Kol, {
        where: { id: savedKol.id },
        relations: ['platforms', 'createdBy'],
      });
    });
  }

  // ─── FIND ALL (with filter + pagination) ──────────────────────────────────

  async findAll(query: KolQueryDto): Promise<PaginatedKols> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC',
    } = query;

    const skip = (page - 1) * limit;
    const sortField = SORT_FIELD_MAP[sortBy] ?? 'kol.createdAt';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    // Separate count query — no joins, so the count is always accurate.
    const total = await this.buildFilterQuery(query).getCount();

    // Data query — adds relation joins after the WHERE conditions are built.
    // TypeORM uses a subquery internally when take/skip + joins are combined,
    // ensuring correct per-KOL pagination (not per-row).
    const data = await this.buildFilterQuery(query)
      .leftJoinAndSelect('kol.platforms', 'platform')
      .leftJoinAndSelect('kol.createdBy', 'creator')
      .orderBy(sortField, sortOrder)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── FIND ONE ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<Kol> {
    const kol = await this.kolRepo.findOne({
      where: { id },
      relations: ['platforms', 'createdBy'],
    });

    if (!kol) {
      throw new NotFoundException(`KOL with ID "${id}" not found`);
    }

    return kol;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateKolDto): Promise<Kol> {
    // Ensure the KOL exists before attempting any update
    await this.findOne(id);

    const { platforms, ...kolData } = dto;

    return this.dataSource.transaction(async (manager) => {
      // Strip undefined values — TypeORM update() treats undefined as NULL otherwise
      const definedKolData = Object.fromEntries(
        Object.entries(kolData).filter(([, v]) => v !== undefined),
      );

      if (Object.keys(definedKolData).length > 0) {
        await manager.update(Kol, id, definedKolData);
      }

      // ── Platform update logic ────────────────────────────────────
      if (platforms !== undefined) {
        if (platforms.length === 0) {
          // Explicit empty array → wipe all platforms
          await manager.delete(KolPlatform, { kolId: id });
        } else {
          // 1. Delete platforms that are no longer in the incoming list
          const incomingNames = platforms.map((p) => p.platformName);
          const existingPlatforms = await manager.find(KolPlatform, {
            where: { kolId: id },
          });
          const toDelete = existingPlatforms
            .filter((ep) => !incomingNames.includes(ep.platformName))
            .map((ep) => ep.id);

          if (toDelete.length > 0) {
            await manager.delete(KolPlatform, toDelete);
          }

          // 2. Upsert each incoming platform
          //    conflictPaths maps to ON CONFLICT (kol_id, platform_name) DO UPDATE
          for (const platformDto of platforms) {
            await manager.upsert(
              KolPlatform,
              { kolId: id, ...platformDto },
              {
                conflictPaths: ['kolId', 'platformName'],
                skipUpdateIfNoValuesChanged: true,
              },
            );
          }
        }
      }

      return manager.findOne(Kol, {
        where: { id },
        relations: ['platforms', 'createdBy'],
      });
    });
  }

  // ─── FILTER QUERY BUILDER ─────────────────────────────────────────────────

  /**
   * Builds a TypeORM QueryBuilder with all WHERE conditions applied.
   * Does NOT add any SELECT joins — callers add those for their specific needs.
   * This keeps the count query clean (no joins = no duplicate rows).
   */
  private buildFilterQuery(query: KolQueryDto): SelectQueryBuilder<Kol> {
    const {
      search,
      city,
      language,
      tags,
      tier,
      isBlacklisted,
      platform,
      minFollowers,
      maxFollowers,
      minEngagement,
      maxEngagement,
    } = query;

    const qb = this.kolRepo.createQueryBuilder('kol');

    // ── KOL table filters ──────────────────────────────────────────

    if (search?.trim()) {
      qb.andWhere(
        '(kol.name ILIKE :search OR kol.nickname ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    if (city?.trim()) {
      qb.andWhere('kol.city ILIKE :city', { city: `%${city.trim()}%` });
    }

    if (language) {
      qb.andWhere('kol.primaryLanguage = :language', { language });
    }

    if (tier) {
      qb.andWhere('kol.kolTier = :tier', { tier });
    }

    if (isBlacklisted !== undefined) {
      qb.andWhere('kol.isBlacklisted = :isBlacklisted', { isBlacklisted });
    }

    if (tags?.length) {
      // PostgreSQL array overlap: content_tags && ARRAY['tag1','tag2']
      // Returns KOLs that have AT LEAST ONE of the provided tags.
      qb.andWhere('kol.contentTags && :tags', { tags });
    }

    // ── Platform filters via EXISTS subquery ───────────────────────
    // Using EXISTS instead of a JOIN keeps the row count correct for pagination.
    // If platform filter + follower/engagement filters are combined, they all
    // apply to the SAME platform row (e.g. Instagram with >50k followers).

    const hasPlatformFilter =
      platform !== undefined ||
      minFollowers !== undefined ||
      maxFollowers !== undefined ||
      minEngagement !== undefined ||
      maxEngagement !== undefined;

    if (hasPlatformFilter) {
      const whereParts: string[] = ['kp.kol_id = kol.id'];
      const params: Record<string, any> = {};

      if (platform) {
        whereParts.push('kp.platform_name = :pf_platform');
        params.pf_platform = platform;
      }
      if (minFollowers !== undefined) {
        whereParts.push('kp.followers_count >= :pf_minFollowers');
        params.pf_minFollowers = minFollowers;
      }
      if (maxFollowers !== undefined) {
        whereParts.push('kp.followers_count <= :pf_maxFollowers');
        params.pf_maxFollowers = maxFollowers;
      }
      if (minEngagement !== undefined) {
        whereParts.push('kp.avg_engagement_rate >= :pf_minEng');
        params.pf_minEng = minEngagement; // Already decimal from DTO validation
      }
      if (maxEngagement !== undefined) {
        whereParts.push('kp.avg_engagement_rate <= :pf_maxEng');
        params.pf_maxEng = maxEngagement;
      }

      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM kol_platforms kp
          WHERE ${whereParts.join(' AND ')}
        )`,
        params,
      );
    }

    return qb;
  }
}
