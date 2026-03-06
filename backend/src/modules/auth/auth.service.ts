import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserRole } from '../../common/enums';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Validate credentials. Returns the user (without passwordHash) or throws. */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Strip passwordHash before returning
    const { passwordHash: _, ...safeUser } = user;
    return safeUser as User;
  }

  /** Issue a JWT for a validated user. */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(dto.email, dto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * One-time seed: creates the first Admin account.
   * Throws 409 if any user already exists in the database.
   */
  async seedAdmin(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const existingCount = await this.usersService.count();
    if (existingCount > 0) {
      throw new ConflictException(
        'Seed endpoint disabled — users already exist. Use the admin panel to add more accounts.',
      );
    }
    const user = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      role: UserRole.ADMIN,
    });
    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  }

  /** Create a new user account (Admin only). */
  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      role: dto.role as UserRole,
    });

    // Strip passwordHash
    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  }
}
