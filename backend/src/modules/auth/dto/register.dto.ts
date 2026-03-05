import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums';

// Admin cannot be created via API — must be seeded directly in DB
const CREATABLE_ROLES = [UserRole.ACCOUNT_MANAGER, UserRole.KOL_MANAGER] as const;
type CreatableRole = (typeof CREATABLE_ROLES)[number];

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsEnum(CREATABLE_ROLES, {
    message: `Role must be one of: ${CREATABLE_ROLES.join(', ')}`,
  })
  role: CreatableRole;
}
