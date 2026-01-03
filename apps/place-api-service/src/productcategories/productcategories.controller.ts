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
import { ProductcategoriesService } from './productcategories.service';
import { CreateProductcategoryDto } from './dto/create-productcategory.dto';
import { UpdateProductcategoryDto } from './dto/update-productcategory.dto';
import { Public, RequireRole } from '../util/decorators';

@Controller('productcategories')
export class ProductcategoriesController {
  constructor(
    private readonly productcategoriesService: ProductcategoriesService,
  ) {}

  @Patch('admin/update/:id')
  @RequireRole('ADMIN')
  updateProductCategoryByAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductcategoryDto,
    @Query('newParentId') newParentId: string,
  ) {
    return this.productcategoriesService.updateProductCategoryByAdmin(
      +id,
      updateDto,
      newParentId ? +newParentId : undefined,
    );
  }

  @Patch('admin/disable/:id')
  @RequireRole('ADMIN')
  disableProductCategoryByAdmin(
    @Param('id') id: string,
    @Query('isDisable') isDisable: string,
  ) {
    return this.productcategoriesService.disableProductCategoryByAdmin(
      +id,
      isDisable === 'true',
    );
  }

  @Post('admin/create')
  @RequireRole('ADMIN')
  createProductCategoryByAdmin(
    @Body() createProductcategoryDto: CreateProductcategoryDto,
    @Query('parentId') parentId: string,
  ) {
    return this.productcategoriesService.createProductCategoryByAdmin(
      createProductcategoryDto,
      parentId ? +parentId : undefined,
    );
  }

  @Get('admin/duplicate-code')
  @RequireRole('ADMIN')
  findDuplicateProductCategoryCode(@Query('code') code: string) {
    return this.productcategoriesService.findDuplicateProductCategoryCode(code);
  }

  @Get('admin/child')
  @RequireRole('ADMIN')
  findChildProductCategoriesByAdmin(@Query('parentId') parentId: string) {
    return this.productcategoriesService.findChildProductCategoriesByAdmin(
      parentId ? +parentId : undefined,
    );
  }

  @Get('ancestor/:categoryId')
  @Public()
  findAncestorCategories(@Param('categoryId') categoryId: string) {
    return this.productcategoriesService.findAncestorCategories(+categoryId);
  }

  @Get('closure')
  @Public()
  findAllProductCategories() {
    return this.productcategoriesService.findAllProductCategories();
  }

  @Get(':id')
  @Public()
  findProductCategoryById(@Param('id') id: string) {
    return this.productcategoriesService.findProductCategoryById(+id);
  }
}
