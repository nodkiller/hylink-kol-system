import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { AddKolsToCampaignDto } from './dto/add-kols-to-campaign.dto';
import { UpdateCampaignKolDto } from './dto/update-campaign-kol.dto';
import { CreateCampaignKolPostDto } from './dto/create-campaign-kol-post.dto';
import { UpdateCampaignKolPostDto } from './dto/update-campaign-kol-post.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { CampaignKolStatus, UserRole } from '../../common/enums';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Campaign CRUD ──────────────────────────────────────────────────────────

  /**
   * POST /campaigns
   * Create a new Campaign. Allowed roles: Admin, AccountManager.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: User) {
    return this.campaignsService.create(dto, user.id);
  }

  /**
   * GET /campaigns
   * List all campaigns with optional filters and pagination.
   * All authenticated users can access.
   *
   * Example queries:
   *   GET /campaigns?status=Planning&clientName=Toyota
   *   GET /campaigns?name=Q1&sortBy=start_date&order=ASC&page=1&limit=10
   */
  @Get()
  findAll(@Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(query);
  }

  /**
   * GET /campaigns/:id
   * Get a single campaign with KOL status summary.
   * All authenticated users can access.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignsService.findOne(id);
  }

  /**
   * PATCH /campaigns/:id
   * Update campaign basic info. Allowed roles: Admin, AccountManager.
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, dto);
  }

  // ─── Campaign-KOL Workflow ──────────────────────────────────────────────────

  /**
   * POST /campaigns/:id/kols
   * Add KOLs to a campaign (batch, initial status = Shortlisted).
   * Blacklisted and non-existent KOLs are reported but don't fail the request.
   *
   * Body: { "kolIds": ["uuid1", "uuid2"] }
   *
   * Response includes:
   *   - added:           newly added campaign-KOL records
   *   - alreadyInCampaign: kolIds that were already present (skipped)
   *   - notFound:        kolIds that don't exist in the KOL database
   *   - blacklisted:     KOLs that are blacklisted (blocked from campaigns)
   */
  @Post(':id/kols')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  addKols(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: AddKolsToCampaignDto,
  ) {
    return this.campaignsService.addKols(campaignId, dto);
  }

  /**
   * GET /campaigns/:id/kols
   * Get all KOLs in a campaign with their pipeline status and data.
   * Optionally filter by status.
   * All authenticated users can access.
   *
   * Example:
   *   GET /campaigns/:id/kols
   *   GET /campaigns/:id/kols?status=Shortlisted
   *   GET /campaigns/:id/kols?status=Negotiating
   */
  @Get(':id/kols')
  getCampaignKols(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Query('status') status?: CampaignKolStatus,
  ) {
    return this.campaignsService.getCampaignKols(campaignId, status);
  }

  /**
   * PATCH /campaigns/:id/portal
   * Set or clear the client portal password. Admin / AccountManager only.
   * Body: { "password": "my-secret" } or { "password": null } to disable portal.
   */
  @Patch(':id/portal')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  updatePortal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('password') password: string | null,
  ) {
    return this.campaignsService.updatePortalPassword(id, password);
  }

  /**
   * PATCH /campaigns/:campaignId/kols/:kolId
   * Core workflow endpoint — update a KOL's status and data within a campaign.
   *
   * Use this to:
   *   - Advance status:   { "status": "Submitted_to_Client" }
   *   - Record fee:       { "status": "Contracted", "negotiatedFee": 2500 }
   *   - Log deliverables: { "deliverables": { "instagram_posts": 2, "deadline": "2025-04-01" } }
   *   - Mark published:   { "status": "Published", "publishedUrls": ["https://..."] }
   *   - Add metrics:      { "status": "Completed", "performanceData": { "total_reach": 85000 } }
   *   - Assign to team:   { "assignedToId": "user-uuid" }
   *   - Add notes:        { "notes": "Agent replied, expecting quote by Friday" }
   */
  @Patch(':campaignId/kols/:kolId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  updateCampaignKol(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
    @Body() dto: UpdateCampaignKolDto,
  ) {
    return this.campaignsService.updateCampaignKol(campaignId, kolId, dto);
  }

  // ─── Post Results ───────────────────────────────────────────────────────────

  /** GET /campaigns/:campaignId/kols/:kolId/posts */
  @Get(':campaignId/kols/:kolId/posts')
  getPostsForKol(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
  ) {
    return this.campaignsService.getPostsForKol(campaignId, kolId);
  }

  /** POST /campaigns/:campaignId/kols/:kolId/posts */
  @Post(':campaignId/kols/:kolId/posts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  addPost(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
    @Body() dto: CreateCampaignKolPostDto,
  ) {
    return this.campaignsService.addPost(campaignId, kolId, dto);
  }

  /** PATCH /campaigns/:campaignId/kols/:kolId/posts/:postId */
  @Patch(':campaignId/kols/:kolId/posts/:postId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  updatePost(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: UpdateCampaignKolPostDto,
  ) {
    return this.campaignsService.updatePost(campaignId, kolId, postId, dto);
  }

  /** DELETE /campaigns/:campaignId/kols/:kolId/posts/:postId */
  @Delete(':campaignId/kols/:kolId/posts/:postId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.campaignsService.deletePost(campaignId, kolId, postId);
  }
}
