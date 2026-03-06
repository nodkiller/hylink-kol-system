import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SeedDto } from './dto/seed.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RolesGuard } from './guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Public endpoint. Returns JWT + basic user info on success.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/seed
   * Public, one-time use. Creates the first Admin account.
   * Returns 409 if any user already exists.
   */
  @Public()
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  seed(@Body() dto: SeedDto) {
    return this.authService.seedAdmin(dto);
  }

  /**
   * POST /auth/register
   * Admin-only. Creates an AccountManager or KOLManager account.
   * JwtAuthGuard is applied globally; RolesGuard checks Admin role.
   */
  @Post('register')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * GET /auth/profile
   * Returns the current authenticated user's profile (from JWT).
   */
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    // passwordHash is already excluded via select:false on entity
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
