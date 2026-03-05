import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { KolTier } from '../../../common/enums';
import { CreateKolPlatformDto } from './create-kol-platform.dto';

export class CreateKolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  ethnicityBackground?: string;

  @IsOptional()
  @IsString()
  primaryLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentTags?: string[];

  @IsOptional()
  @IsEnum(KolTier, {
    message: `kolTier must be one of: ${Object.values(KolTier).join(', ')}`,
  })
  kolTier?: KolTier;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  talentAgencyName?: string;

  @IsOptional()
  @IsString()
  talentAgencyContact?: string;

  /**
   * Rate card object. Example:
   * { "instagram_post": 1500, "tiktok_video": 2000, "currency": "AUD" }
   */
  @IsOptional()
  @IsObject()
  rateCard?: Record<string, any>;

  /**
   * Audience demographics object. Example:
   * { "age_range": "18-34", "top_cities": ["Sydney"], "gender_split": { "female": 62, "male": 38 } }
   */
  @IsOptional()
  @IsObject()
  audienceDemographics?: Record<string, any>;

  @IsOptional()
  @IsString()
  agencyInternalNotes?: string;

  /** Internal collaboration rating: 0.0–5.0 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  collaborationRating?: number;

  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  /** Social media platform accounts to create together with this KOL. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKolPlatformDto)
  platforms?: CreateKolPlatformDto[];
}
