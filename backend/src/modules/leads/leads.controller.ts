import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { LeadsService } from './leads.service';
import { SubmitLeadDto } from './dto/submit-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Public endpoint — called by the brand's landing page when a visitor
   * submits a test-drive/enquiry form via a KOL tracking link.
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: SubmitLeadDto) {
    return this.leadsService.submit(dto);
  }

  /** Get all leads for a specific campaign KOL */
  @Get()
  getByKol(@Query('campaignKolId', ParseUUIDPipe) campaignKolId: string) {
    return this.leadsService.getByKol(campaignKolId);
  }

  /** Get lead stats (counts by status) grouped by KOL for a whole campaign */
  @Get('stats')
  getStatsByCampaign(@Query('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.leadsService.getStatsByCampaign(campaignId);
  }

  /** Update a lead's status or notes */
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }
}
