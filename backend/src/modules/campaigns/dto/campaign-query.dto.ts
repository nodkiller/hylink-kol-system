import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CampaignStatus } from '../../../common/enums';

export class CampaignQueryDto {
  /** Exact match on campaign status */
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  /** Fuzzy search on client name (case-insensitive) */
  @IsOptional()
  @IsString()
  clientName?: string;

  /** Fuzzy search on campaign name */
  @IsOptional()
  @IsString()
  name?: string;

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

  @IsOptional()
  @IsIn(['name', 'client_name', 'status', 'created_at', 'start_date'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
