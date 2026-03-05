import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignKol } from '../campaigns/entities/campaign-kol.entity';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, CampaignKol])],
  providers: [PortalService],
  controllers: [PortalController],
})
export class PortalModule {}
