import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { PlatformName } from '../../../common/enums';

export class CreateKolPlatformDto {
  @IsEnum(PlatformName, {
    message: `platformName must be one of: ${Object.values(PlatformName).join(', ')}`,
  })
  platformName: PlatformName;

  @IsString()
  @IsNotEmpty()
  handle: string;

  @IsOptional()
  @IsUrl({}, { message: 'profileUrl must be a valid URL' })
  profileUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  followersCount?: number;

  /**
   * Engagement rate stored as decimal: 0.0356 = 3.56%.
   * Pass 0.0356, not 3.56.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  avgEngagementRate?: number;
}
