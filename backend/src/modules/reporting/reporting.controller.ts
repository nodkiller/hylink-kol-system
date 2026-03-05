import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportingService } from './reporting.service';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /** Aggregated dashboard stats for the admin frontend. */
  @Get('dashboard')
  async getDashboardStats() {
    return this.reportingService.getDashboardStats();
  }

  /** Generate and stream a PDF performance report for a single campaign. */
  @Get('campaign/:id')
  async downloadCampaignReport(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportingService.generateCampaignPdf(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="campaign-report-${id}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }
}
