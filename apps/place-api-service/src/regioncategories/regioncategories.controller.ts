import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RegioncategoriesService } from './regioncategories.service';
import { CreateRegioncategoryDto } from './dto/create-regioncategory.dto';
import { UpdateRegioncategoryDto } from './dto/update-regioncategory.dto';
import { Public, RequireRole } from '../util/decorators';

@Controller('regioncategories')
export class RegioncategoriesController {
  constructor(
    private readonly regioncategoriesService: RegioncategoriesService,
  ) {}

  @RequireRole('ADMIN')
  @Patch('admin/update/:id')
  updateRegionCategoryByAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateRegioncategoryDto,
    @Query('newParentId') newParentId: string,
  ) {
    return this.regioncategoriesService.updateRegionCategory(
      +id,
      updateDto,
      newParentId ? +newParentId : undefined,
    );
  }

  @RequireRole('ADMIN')
  @Patch('admin/disable/:id')
  disbleRegionCategoryByAdmin(
    @Param('id') id: string,
    @Query('isDisable') isDisable: string,
  ) {
    return this.regioncategoriesService.disbleRegionCategory(
      +id,
      isDisable === 'true',
    );
  }

  @RequireRole('ADMIN')
  @Post('admin/create')
  createRegionCategoryByAdmin(
    @Body() createRegioncategoryDto: CreateRegioncategoryDto,
    @Query('parentId') parentId: string,
  ) {
    return this.regioncategoriesService.createRegionCategory(
      createRegioncategoryDto,
      parentId ? +parentId : undefined,
    );
  }

  @RequireRole('ADMIN')
  @Get('admin/child')
  findChildRegionCategoriesByAdmin(@Query('parentId') parentId: string) {
    return this.regioncategoriesService.findChildRegionCategories(
      parentId ? +parentId : undefined,
    );
  }

  @Get('admin/closure')
  findAllRegionCategoriesByAdmin() {
    return this.regioncategoriesService.findAllRegionCategories(true);
  }


  @Get('ancestor/:categoryId')
  @Public()
  findAncestorCategories(@Param('categoryId') categoryId: string) {
    return this.regioncategoriesService.findAncestorCategories(+categoryId);
  }

  @Get('closure')
  @Public()
  findAllRegionCategories() {
    return this.regioncategoriesService.findAllRegionCategories();
  }

  @Get(':id')
  @Public()
  findRegionCategoryById(@Param('id') id: string) {
    return this.regioncategoriesService.findRegionCategory(+id);
  }
}
