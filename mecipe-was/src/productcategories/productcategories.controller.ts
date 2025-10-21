import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductcategoriesService } from './productcategories.service';
import { CreateProductcategoryDto } from './dto/create-productcategory.dto';
import { UpdateProductcategoryDto } from './dto/update-productcategory.dto';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';
import { Public } from 'src/util/decorators';

@Controller('productcategories')
export class ProductcategoriesController {
  constructor(private readonly productcategoriesService: ProductcategoriesService) { }

  @Patch('admin/update/:id')
  @UseGuards(AdminAuthGuard)
  updateProductCategoryByAdmin(
    @Param('id') id: string, 
    @Body() updateDto: UpdateProductcategoryDto, 
    @Query('newParentId') newParentId: string
  ) {
    return this.productcategoriesService.updateProductCategoryByAdmin(
      +id, 
      updateDto, 
      newParentId ? +newParentId : undefined
    );
  }

  @Patch('admin/disable/:id')
  @UseGuards(AdminAuthGuard)
  disableProductCategoryByAdmin(
    @Param('id') id: string, 
    @Query('isDisable') isDisable: string
  ) {
    return this.productcategoriesService.disableProductCategoryByAdmin(+id, isDisable === 'true');
  }

  @Post('admin/create')
  @UseGuards(AdminAuthGuard)
  createProductCategoryByAdmin(
    @Body() createProductcategoryDto: CreateProductcategoryDto, 
    @Query('parentId') parentId: string
  ) {
    return this.productcategoriesService.createProductCategoryByAdmin(
      createProductcategoryDto, 
      parentId ? +parentId : undefined
    );
  }

  @Get('admin/duplicate-code')
  @UseGuards(AdminAuthGuard)
  findDuplicateProductCategoryCode(@Query('code') code: string) {
    return this.productcategoriesService.findDuplicateProductCategoryCode(code);
  }

  @Get('admin/child')
  @UseGuards(AdminAuthGuard)
  findChildProductCategoriesByAdmin(@Query('parentId') parentId: string) {
    return this.productcategoriesService.findChildProductCategoriesByAdmin(
      parentId ? +parentId : undefined
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
