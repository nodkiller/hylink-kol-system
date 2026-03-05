import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { KolTier, PlatformName } from '../../../common/enums';

export class KolQueryDto {
  // ── Text search ──────────────────────────────────────────────────

  /** Fuzzy search on name or nickname (case-insensitive). */
  @IsOptional()
  @IsString()
  search?: string;

  // ── Platform-level filters ───────────────────────────────────────

  /** Filter by social media platform (matches KOLs who have an account on this platform). */
  @IsOptional()
  @IsEnum(PlatformName)
  platform?: PlatformName;

  /** Minimum followers count on any platform (or the specified platform). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFollowers?: number;

  /** Maximum followers count on any platform (or the specified platform). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFollowers?: number;

  /**
   * Minimum average engagement rate (decimal).
   * Example: 0.035 = 3.5%
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  minEngagement?: number;

  /**
   * Maximum average engagement rate (decimal).
   * Example: 0.08 = 8%
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  maxEngagement?: number;

  // ── KOL attribute filters ────────────────────────────────────────

  /** Fuzzy match on city name. */
  @IsOptional()
  @IsString()
  city?: string;

  /** Exact match on primary_language. */
  @IsOptional()
  @IsString()
  language?: string;

  /**
   * Filter KOLs whose content_tags overlap with ANY of the provided tags.
   * Accepts comma-separated string: ?tags=Automotive,Lifestyle
   * Or repeated keys:              ?tags[]=Automotive&tags[]=Lifestyle
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Filter by KOL tier. */
  @IsOptional()
  @IsEnum(KolTier)
  tier?: KolTier;

  /** Filter by blacklist status. Pass true/false as string in query params. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isBlacklisted?: boolean;

  // ── Pagination ───────────────────────────────────────────────────

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // ── Sorting ──────────────────────────────────────────────────────

  /**
   * Field to sort by.
   * Allowed values: name | created_at | updated_at | collaboration_rating | city
   */
  @IsOptional()
  @IsIn(['name', 'created_at', 'updated_at', 'collaboration_rating', 'city'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
