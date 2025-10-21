import { Module } from '@nestjs/common';
import { RegioncategoriesService } from './regioncategories.service';
import { RegioncategoriesController } from './regioncategories.controller';

@Module({
  controllers: [RegioncategoriesController],
  providers: [RegioncategoriesService]
})
export class RegioncategoriesModule {}
