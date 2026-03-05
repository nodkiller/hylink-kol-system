import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { CampaignStatus } from '../../../common/enums';

/** Custom cross-field validator: endDate must be >= startDate */
@ValidatorConstraint({ name: 'endDateAfterStartDate', async: false })
class EndDateAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const obj = args.object as CreateCampaignDto;
    if (!endDate || !obj.startDate) return true; // both optional
    return new Date(endDate) >= new Date(obj.startDate);
  }
  defaultMessage() {
    return 'endDate must be on or after startDate';
  }
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  /** ISO date string: "2025-03-15" */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** ISO date string: "2025-06-30" — must be ≥ startDate */
  @IsOptional()
  @IsDateString()
  @Validate(EndDateAfterStartDate)
  endDate?: string;

  @IsOptional()
  @IsUrl({}, { message: 'briefDocumentUrl must be a valid URL' })
  briefDocumentUrl?: string;

  /** Plaintext password shared with the client for the read-only portal view */
  @IsOptional()
  @IsString()
  clientPortalPassword?: string;

  // ── Financial fields ──────────────────────────────────────────

  /** Client's approved budget for the campaign (AUD) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number;

  /** Amount we invoice the client — our campaign revenue (AUD) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  clientBilling?: number;

  /** Non-KOL costs: production, ad spend, platform fees, etc. (AUD) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherExpenses?: number;
}
