import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Min,
} from 'class-validator';
import { PostContentType, PostSentiment } from '../../../common/enums';

export class CreateCampaignKolPostDto {
  @IsUrl({}, { message: 'postUrl must be a valid URL' })
  postUrl: string;

  @IsEnum(PostContentType)
  contentType: PostContentType;

  @IsOptional() @IsDateString()
  publishedAt?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) views?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) likes?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) comments?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shares?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) saves?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) reach?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) impressions?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) ctr?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) attributedSales?: number;
  @IsOptional() @IsEnum(PostSentiment) sentiment?: PostSentiment;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) revisionRounds?: number;
  @IsOptional() @IsString() notes?: string;
}
