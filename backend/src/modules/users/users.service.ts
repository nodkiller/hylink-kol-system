import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/enums';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Find a user by UUID (excludes passwordHash by default via entity select:false). */
  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  /** Find a user by email — includes passwordHash for auth comparison. */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash') // passwordHash has select:false on entity
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Create a new user. Throws 409 if email already exists. */
  async create(data: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException(`Email ${data.email} is already registered`);
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: data.role,
    });

    return this.userRepo.save(user);
  }

  /** List all users (Admin use). */
  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** Soft-deactivate a user account. */
  async deactivate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    await this.userRepo.update(id, { isActive: false });
  }
}
