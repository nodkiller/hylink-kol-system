import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBenchmarkDto {
  @IsNotEmpty()
  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  periodLabel?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  spend: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  leads: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  testDrives: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  conversions: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
