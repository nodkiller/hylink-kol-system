import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kol } from './entities/kol.entity';
import { KolPlatform } from './entities/kol-platform.entity';
import { KolsService } from './kols.service';
import { KolsController } from './kols.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Kol, KolPlatform])],
  providers: [KolsService],
  controllers: [KolsController],
  exports: [KolsService],
})
export class KolsModule {}
