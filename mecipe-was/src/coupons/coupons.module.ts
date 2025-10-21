import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { PrismaService } from 'src/global/prisma.service';

@Module({
  imports: [
    
  ],
  controllers: [CouponsController],
  providers: [CouponsService, PrismaService]
})
export class CouponsModule {}
