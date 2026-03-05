import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CampaignKolStatus } from '../../../common/enums';

export class UpdateCampaignKolDto {
  /**
   * Advance the KOL through the campaign workflow.
   * Valid status flow (recommended, not enforced by API):
   * Shortlisted → Submitted_to_Client → Approved_by_Client → Contacted
   *   → Negotiating → Contracted → Content_Submitted → Content_Approved
   *   → Published → Completed
   * Or: Submitted_to_Client → Rejected_by_Client
   */
  @IsOptional()
  @IsEnum(CampaignKolStatus, {
    message: `status must be one of: ${Object.values(CampaignKolStatus).join(', ')}`,
  })
  status?: CampaignKolStatus;

  /** Final negotiated fee in AUD. Set when status reaches Contracted. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  negotiatedFee?: number;

  /**
   * Content deliverables agreed with this KOL.
   * Example: { "instagram_posts": 2, "stories": 3, "deadline": "2025-04-01" }
   */
  @IsOptional()
  @IsObject()
  deliverables?: Record<string, any>;

  /**
   * URLs of published content. Add URLs as content goes live.
   * Example: ["https://www.instagram.com/p/xxx", "https://www.tiktok.com/@user/video/yyy"]
   */
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each published URL must be a valid URL' })
  publishedUrls?: string[];

  /**
   * Post-campaign performance metrics.
   * Example: { "total_reach": 85000, "total_engagements": 4200, "cpe": 0.48 }
   */
  @IsOptional()
  @IsObject()
  performanceData?: Record<string, any>;

  /** Assign (or reassign) this KOL's follow-up to a specific team member (by user UUID). */
  @IsOptional()
  @IsUUID('4', { message: 'assignedToId must be a valid UUID' })
  assignedToId?: string;

  /** Internal follow-up notes (not visible to client). */
  @IsOptional()
  @IsString()
  notes?: string;

  /** Mark whether we have paid this KOL their negotiated fee. */
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  /** Invoice or payment reference number for reconciliation. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceRef?: string;
}
