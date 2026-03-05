import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KolsService } from './kols.service';
import { CreateKolDto } from './dto/create-kol.dto';
import { UpdateKolDto } from './dto/update-kol.dto';
import { KolQueryDto } from './dto/kol-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums';

@Controller('kols')
export class KolsController {
  constructor(private readonly kolsService: KolsService) {}

  /**
   * POST /kols
   * Create a new KOL record (with optional platform accounts).
   * Allowed roles: Admin, KOLManager
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KOL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateKolDto, @CurrentUser() user: User) {
    return this.kolsService.create(dto, user.id);
  }

  /**
   * GET /kols
   * List KOLs with optional filters, sorting, and pagination.
   * All authenticated users can access.
   *
   * Example queries:
   *   GET /kols?search=jennifer&platform=Instagram&minFollowers=10000
   *   GET /kols?tags=Automotive,Lifestyle&tier=Micro(10k-100k)&city=Sydney
   *   GET /kols?minEngagement=0.03&maxEngagement=0.08&sortBy=collaboration_rating&order=DESC
   *   GET /kols?page=2&limit=10&isBlacklisted=false
   */
  @Get()
  findAll(@Query() query: KolQueryDto) {
    return this.kolsService.findAll(query);
  }

  /**
   * GET /kols/:id
   * Get a single KOL with all platform accounts and creator info.
   * All authenticated users can access.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.kolsService.findOne(id);
  }

  /**
   * PATCH /kols/:id
   * Partially update a KOL's basic info and/or platform accounts.
   * Allowed roles: Admin, KOLManager, AccountManager
   *
   * Platform update semantics:
   *   - Field omitted           → platforms are not touched
   *   - platforms: []           → all platforms are deleted
   *   - platforms: [{...}, ...] → provided platforms are upserted;
   *                               platforms not in the list are deleted
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KOL_MANAGER, UserRole.ACCOUNT_MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKolDto,
  ) {
    return this.kolsService.update(id, dto);
  }
}
