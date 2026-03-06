import { Controller, Get, Query } from '@nestjs/common';
import { InfluencerSearchService } from './influencer-search.service';

@Controller('influencer-search')
export class InfluencerSearchController {
  constructor(private readonly service: InfluencerSearchService) {}

  /** GET /influencer-search/search?q=keyword */
  @Get('search')
  search(@Query('q') q: string) {
    return this.service.searchUsers(q ?? '');
  }

  /** GET /influencer-search/user?username=xxx */
  @Get('user')
  getUser(@Query('username') username: string) {
    return this.service.getUserInfo(username ?? '');
  }
}
