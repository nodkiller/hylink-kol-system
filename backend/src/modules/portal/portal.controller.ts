import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Headers,
} from '@nestjs/common';
import { PortalService } from './portal.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { Public } from '../auth/decorators/public.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

class VerifyPasswordDto {
  @IsString() @IsNotEmpty()
  password: string;
}

/**
 * Client-facing portal endpoints — all routes are @Public (no JWT required).
 * Authentication is done via the x-portal-password header after initial verify.
 */
@Public()
@Controller('portal/campaigns')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * POST /portal/campaigns/:id/verify
   * Validates the portal password. Call this once; store the password client-side
   * and pass it as x-portal-password on subsequent requests.
   */
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: VerifyPasswordDto,
  ) {
    return this.portalService.verifyPortalAccess(campaignId, dto.password);
  }

  /**
   * GET /portal/campaigns/:id/shortlist
   * Returns Shortlisted + Submitted_to_Client KOLs for the client to review.
   * Requires x-portal-password header.
   */
  @Get(':id/shortlist')
  getShortlist(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Headers('x-portal-password') password: string,
  ) {
    return this.portalService.getShortlist(campaignId, password);
  }

  /**
   * POST /portal/campaigns/:campaignId/kols/:kolId/feedback
   * Submit Approve/Reject feedback for a KOL.
   * Requires x-portal-password header.
   * Automatically updates campaign_kol status to Approved_by_Client or Rejected_by_Client.
   */
  @Post(':campaignId/kols/:kolId/feedback')
  @HttpCode(HttpStatus.OK)
  submitFeedback(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
    @Headers('x-portal-password') password: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.portalService.submitFeedback(campaignId, kolId, password, dto);
  }
}
