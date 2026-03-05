import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignKol } from '../campaigns/entities/campaign-kol.entity';
import { Kol } from '../kols/entities/kol.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, CampaignKol, Kol])],
  providers: [ReportingService],
  controllers: [ReportingController],
})
export class ReportingModule {}
