import { Module } from '@nestjs/common';
import { InfluencerSearchController } from './influencer-search.controller';
import { InfluencerSearchService } from './influencer-search.service';

@Module({
  controllers: [InfluencerSearchController],
  providers: [InfluencerSearchService],
})
export class InfluencerSearchModule {}
