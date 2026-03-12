import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CampaignKol } from '../campaigns/entities/campaign-kol.entity';
import { SubmitLeadDto } from './dto/submit-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '../../common/enums';

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,

    @InjectRepository(CampaignKol)
    private readonly campaignKolRepo: Repository<CampaignKol>,
  ) {}

  /** Public: submit a lead from a tracking link (called by landing page) */
  async submit(dto: SubmitLeadDto): Promise<Lead> {
    const campaignKol = await this.campaignKolRepo.findOne({
      where: { trackingCode: dto.trackingCode },
    });

    if (!campaignKol) {
      throw new BadRequestException(`Invalid tracking code: ${dto.trackingCode}`);
    }

    const lead = this.leadRepo.create({
      campaignKolId: campaignKol.id,
      trackingCode: dto.trackingCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      notes: dto.notes,
      status: LeadStatus.NEW,
    });

    return this.leadRepo.save(lead);
  }

  /** Get all leads for a specific campaign KOL */
  async getByKol(campaignKolId: string): Promise<Lead[]> {
    return this.leadRepo.find({
      where: { campaignKolId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get lead stats (counts by status) for all KOLs in a campaign */
  async getStatsByCampaign(campaignId: string): Promise<Record<string, LeadStats>> {
    const rows = await this.leadRepo
      .createQueryBuilder('lead')
      .innerJoin('lead.campaignKol', 'ck')
      .where('ck.campaignId = :campaignId', { campaignId })
      .select('ck.id', 'campaignKolId')
      .addSelect('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ck.id')
      .addGroupBy('lead.status')
      .getRawMany<{ campaignKolId: string; status: LeadStatus; count: string }>();

    // Build a map: campaignKolId -> { total, byStatus }
    const result: Record<string, LeadStats> = {};
    for (const row of rows) {
      if (!result[row.campaignKolId]) {
        result[row.campaignKolId] = {
          total: 0,
          byStatus: {} as Record<LeadStatus, number>,
        };
      }
      const count = parseInt(row.count, 10);
      result[row.campaignKolId].byStatus[row.status] = count;
      result[row.campaignKolId].total += count;
    }

    return result;
  }

  /** Update lead status or notes */
  async update(leadId: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead "${leadId}" not found`);

    const update: Partial<Lead> = {};
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.notes !== undefined) update.notes = dto.notes;

    if (Object.keys(update).length > 0) {
      await this.leadRepo.update(leadId, update);
    }

    return (await this.leadRepo.findOne({ where: { id: leadId } }))!;
  }
}
