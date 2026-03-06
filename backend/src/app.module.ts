import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { KolsModule } from './modules/kols/kols.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// Entities
import { User } from './modules/users/entities/user.entity';
import { Kol } from './modules/kols/entities/kol.entity';
import { KolPlatform } from './modules/kols/entities/kol-platform.entity';
import { Campaign } from './modules/campaigns/entities/campaign.entity';
import { CampaignKol } from './modules/campaigns/entities/campaign-kol.entity';
import { PortalModule } from './modules/portal/portal.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { InfluencerSearchModule } from './modules/influencer-search/influencer-search.module';

@Module({
  imports: [
    // ── Config (loads .env) ─────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Database ────────────────────────────────────────────────
    // Supports both DATABASE_URL (Railway/Heroku) and individual DB_* vars
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const ssl = isProduction ? { rejectUnauthorized: false } : false;

        if (databaseUrl) {
          // Railway / Heroku provide a single DATABASE_URL connection string
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, Kol, KolPlatform, Campaign, CampaignKol],
            synchronize: config.get<boolean>('DB_SYNCHRONIZE', true),
            logging: false,
            ssl,
          };
        }

        // Local development: use individual DB_* variables
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE', 'hylink_kol'),
          entities: [User, Kol, KolPlatform, Campaign, CampaignKol],
          synchronize: config.get<boolean>('DB_SYNCHRONIZE', false),
          logging: config.get<boolean>('DB_LOGGING', false),
          ssl,
        };
      },
    }),

    // ── Feature Modules ─────────────────────────────────────────
    AuthModule,
    UsersModule,
    KolsModule,
    CampaignsModule,
    PortalModule,
    ReportingModule,
    InfluencerSearchModule,
  ],

  providers: [
    // Register JwtAuthGuard globally — all routes require auth by default.
    // Use @Public() decorator on routes that should be publicly accessible.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
