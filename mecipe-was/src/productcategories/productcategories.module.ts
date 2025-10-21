import { Module } from '@nestjs/common';
import { ProductcategoriesService } from './productcategories.service';
import { ProductcategoriesController } from './productcategories.controller';
import { PrismaService } from 'src/global/prisma.service';

@Module({
  imports: [
    PrismaService,
  ],
  controllers: [ProductcategoriesController],
  providers: [ProductcategoriesService],
  exports: [ProductcategoriesService]
})
export class ProductcategoriesModule {}
