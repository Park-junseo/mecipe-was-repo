import { Module } from '@nestjs/common';
import { CaferealimagesService } from './caferealimages.service';
import { CaferealimagesController } from './caferealimages.controller';
import { PrismaService } from 'src/global/prisma.service';

@Module({
  imports: [],
  controllers: [CaferealimagesController],
  providers: [CaferealimagesService, PrismaService],
})
export class CaferealimagesModule {}
