import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { CreateBenchmarkDto } from './dto/create-benchmark.dto';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /** Aggregated dashboard stats for the admin frontend. */
  @Get('dashboard')
  async getDashboardStats() {
    return this.reportingService.getDashboardStats();
  }

  /** ROI comparison: KOL vs media benchmarks + per-KOL performance table. */
  @Get('roi')
  async getROIStats() {
    return this.reportingService.getROIStats();
  }

  /** Create a media channel benchmark entry (SEM, Meta, etc.). */
  @Post('benchmarks')
  async createBenchmark(@Body() dto: CreateBenchmarkDto) {
    return this.reportingService.createBenchmark(dto);
  }

  /** Delete a benchmark entry by ID. */
  @Delete('benchmarks/:id')
  @HttpCode(204)
  async deleteBenchmark(@Param('id') id: string) {
    await this.reportingService.deleteBenchmark(id);
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
