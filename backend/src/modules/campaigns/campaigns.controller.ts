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

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: User) {
    return this.campaignsService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignsService.findOne(id);
  }

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

  @Get(':id/kols')
  getCampaignKols(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Query('status') status?: CampaignKolStatus,
  ) {
    return this.campaignsService.getCampaignKols(campaignId, status);
  }

  @Patch(':id/portal')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  updatePortal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('password') password: string | null,
  ) {
    return this.campaignsService.updatePortalPassword(id, password);
  }

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

  @Get(':campaignId/kols/:campaignKolId/posts')
  getPostsForKol(
    @Param('campaignKolId', ParseUUIDPipe) campaignKolId: string,
  ) {
    return this.campaignsService.getPostsForKol(campaignKolId);
  }

  @Post(':campaignId/kols/:campaignKolId/posts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  createPost(
    @Param('campaignKolId', ParseUUIDPipe) campaignKolId: string,
    @Body() dto: CreateCampaignKolPostDto,
  ) {
    return this.campaignsService.createPost(campaignKolId, dto);
  }

  @Patch(':campaignId/kols/:campaignKolId/posts/:postId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  updatePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: UpdateCampaignKolPostDto,
  ) {
    return this.campaignsService.updatePost(postId, dto);
  }

  @Delete(':campaignId/kols/:campaignKolId/posts/:postId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param('postId', ParseUUIDPipe) postId: string) {
    return this.campaignsService.deletePost(postId);
  }
}
