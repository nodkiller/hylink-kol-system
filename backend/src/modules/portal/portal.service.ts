import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignKol } from '../campaigns/entities/campaign-kol.entity';
import { CampaignKolStatus } from '../../common/enums';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

/** Statuses shown on the client-facing portal */
const PORTAL_STATUSES = [
  CampaignKolStatus.SHORTLISTED,
  CampaignKolStatus.SUBMITTED_TO_CLIENT,
];

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,

    @InjectRepository(CampaignKol)
    private readonly campaignKolRepo: Repository<CampaignKol>,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCampaignOrThrow(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  private async verifyPassword(campaign: Campaign, password: string): Promise<void> {
    if (!campaign.clientPortalPassword) {
      throw new UnauthorizedException('This campaign portal is not enabled');
    }
    if (campaign.clientPortalPassword !== password) {
      throw new UnauthorizedException('Invalid portal password');
    }
  }

  // ─── Public Methods ──────────────────────────────────────────────────────────

  /** Verify the portal password — called once on first access. */
  async verifyPortalAccess(campaignId: string, password: string): Promise<{ verified: true; campaignName: string }> {
    const campaign = await this.getCampaignOrThrow(campaignId);
    await this.verifyPassword(campaign, password);
    return { verified: true, campaignName: campaign.name };
  }

  /** Get Shortlisted + Submitted KOLs for the client portal view. */
  async getShortlist(campaignId: string, password: string): Promise<CampaignKol[]> {
    const campaign = await this.getCampaignOrThrow(campaignId);
    await this.verifyPassword(campaign, password);

    return this.campaignKolRepo
      .createQueryBuilder('ck')
      .leftJoinAndSelect('ck.kol', 'kol')
      .leftJoinAndSelect('kol.platforms', 'platform')
      .where('ck.campaignId = :campaignId', { campaignId })
      .andWhere('ck.status IN (:...statuses)', { statuses: PORTAL_STATUSES })
      .orderBy('ck.createdAt', 'ASC')
      .getMany();
  }

  /** Save client's approve/reject feedback on a KOL. */
  async submitFeedback(
    campaignId: string,
    kolId: string,
    password: string,
    dto: SubmitFeedbackDto,
  ): Promise<CampaignKol> {
    const campaign = await this.getCampaignOrThrow(campaignId);
    await this.verifyPassword(campaign, password);

    const record = await this.campaignKolRepo.findOne({
      where: { campaignId, kolId },
    });
    if (!record) {
      throw new NotFoundException(`KOL not found in this campaign`);
    }

    await this.campaignKolRepo.update(
      { campaignId, kolId },
      {
        clientFeedback: dto.clientFeedback,
        clientComment: dto.clientComment ?? null,
        // Automatically advance status based on feedback
        status:
          dto.clientFeedback === 'Approved'
            ? CampaignKolStatus.APPROVED_BY_CLIENT
            : CampaignKolStatus.REJECTED_BY_CLIENT,
        statusUpdatedAt: new Date(),
      },
    );

    return (await this.campaignKolRepo.findOne({
      where: { campaignId, kolId },
      relations: ['kol', 'kol.platforms'],
    }))!;
  }
}
