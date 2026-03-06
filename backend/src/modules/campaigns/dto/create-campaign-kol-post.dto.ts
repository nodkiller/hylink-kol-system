import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { PlatformName, PostContentType, PostSentiment } from '../../../common/enums';

export class CreateCampaignKolPostDto {
  @IsUrl({}, { message: 'postUrl must be a valid URL' })
  postUrl: string;

  @IsEnum(PlatformName)
  platform: PlatformName;

  @IsEnum(PostContentType)
  contentType: PostContentType;

  @IsOptional()
  @IsDateString()
  postedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  views?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  likes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  comments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shares?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  saves?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clicks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  conversions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  attributedSales?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  emv?: number;

  @IsOptional()
  @IsEnum(PostSentiment)
  sentiment?: PostSentiment;

  @IsOptional()
  @IsString()
  notes?: string;
}
