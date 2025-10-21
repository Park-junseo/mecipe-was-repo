import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/global/prisma.service';
import { SearchProductDto } from './dto/search-product.dto';
import { Prisma } from 'prisma/basic';
import { CategoryTree } from './dto/public-product.dto';

type ProductCategoryInfo = Prisma.ProductCategoryGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    description: true;
  };
}>;

@Injectable()
export class ProductsService {

  constructor(private readonly prisma: PrismaService) { }

  async createProduct(createProductDto: CreateProductDto) {

    const { productImages, cafeInfoId, productRedirectUrlArray, categoryId, ...productData } = createProductDto;

    const cafeInfo = await this.prisma.cafeInfo.findUnique({
      where: { id: cafeInfoId }
    });

    if (!cafeInfo) {
      throw new NotFoundException('CafeInfo not found');
    }

    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          productRedirectUrl: productRedirectUrlArray ? JSON.stringify(productRedirectUrlArray) : null,
          ProductCategory: {
            connect: { id: categoryId }
          },
          CafeInfo: {
            connect: { id: cafeInfoId }
          }
        }
      });

      if (productImages && productImages.length > 0) {

        await tx.productImage.createMany({
          data: productImages.map(image => ({
            ...image,
            productId: product.id
          }))
        });
      }

      const createdProduct = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          ProductImages: true,
        }
      })
      return createdProduct;
    });
  }

  async findAllProductsBySearch(searchDto: SearchProductDto, isAdmin: boolean = false) {
    const { page: pageParam, limit: limitParam, ...searchParams } = searchDto;
    const page = pageParam ?? 1;
    const limit = limitParam ?? 10;
    const skip = (page - 1) * limit;

    console.log("searchDto", searchDto);

    const where: Prisma.ProductWhereInput = {};

    if (searchParams.cafeInfoId) {
      where.cafeInfoId = searchParams.cafeInfoId;
    }

    if (searchParams.categoryId) {
      where.categoryId = {
        in: await this.getDescendantCategoryIds(searchParams.categoryId)
      }
    }

    if (searchParams.searchText) {
      switch (searchParams.searchType) {
        case 'name':
          where.name = { contains: searchParams.searchText, mode: 'insensitive' };
          break;
        case 'code':
          where.code = { contains: searchParams.searchText, mode: 'insensitive' };
          break;
        default:
          where.name = { contains: searchParams.searchText, mode: 'insensitive' };
      }
    }

    if (!isAdmin) {
      where.isDisable = false;
    } else {
      where.isDisable = searchParams.isDisable?? false;
    }

    const total = await this.prisma.product.count({ where });

    const products = total > 0 ? await this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ProductImages: {
          where: {
            isThumb: true
          }
        },
        ProductCategory: true,
      }
    }) : [];

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async getDescendantCategoryIds(categoryId: number): Promise<number[]> {
    const descendatns = await this.prisma.closureRegionCategory.findMany({
      where: {
        ancestor: categoryId
      },
      select: {
        descendant: true,
        depth: true
      },
      orderBy: {
        depth: 'desc'
      }
    });

    return descendatns.map(rel => rel.descendant)
  }

  findOne(id: number, isAdmin: boolean = false) {
    const where: Prisma.ProductWhereInput = { id };

    if (!isAdmin) {
      where.isDisable = false;
    }

    return this.prisma.product.findFirst({
      where,
      include: {
        ProductImages: true,
        CafeInfo: true,
        ProductCategory: true,
      }
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto, isAdmin: boolean = false) {
    const product = await this.findOne(id, isAdmin);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { productImages, disabledImageIds, productRedirectUrlArray, isThumbImageId, ...productData } = updateProductDto;

    return this.prisma.$transaction(async (tx) => {

      let updateData: Prisma.ProductUpdateInput = {...productData};
      if (productRedirectUrlArray) {
        updateData.productRedirectUrl = productRedirectUrlArray.length > 0 ? JSON.stringify(productRedirectUrlArray) : null;
      }

      // Board 수정
      await tx.product.update({
        where: { id },
        data: updateData,
      });

      if (disabledImageIds !== undefined) {
        await tx.productImage.updateMany({
          where: { id: { in: disabledImageIds } },
          data: { isDisable: true },
        });
      }

      // BoardImage 업데이트
      if (productImages !== undefined) {

        // 새로운 BoardImage들 생성
        if (productImages && productImages.length > 0) {
          await tx.productImage.createMany({
            data: productImages.map((image) => ({
              ...image,
              productId: id,
              isThumb: image.isThumb ?? false,
            })),
          });
        }

        if (productImages.some(image => image.isThumb)) {
          await tx.productImage.updateMany({
            where: { productId: id, isThumb: true },
            data: { isThumb: false },
          });
        }
      }

      if (isThumbImageId) {

        const tagetImage = await tx.productImage.findFirst({
          where: { id: isThumbImageId, productId: id },
        });

        if (tagetImage) {
          await tx.productImage.updateMany({
            where: { productId: id, isThumb: true },
            data: { isThumb: false },
          });
          await tx.productImage.update({
            where: { id: tagetImage.id },
            data: { isThumb: true },
          });
        }
      }

      const updatedProduct = await tx.product.findUnique({
        where: { id },
        include: {
          ProductImages: true,
          CafeInfo: true,
          ProductCategory: true,
        }
      })

      return updatedProduct;
    });
  }

  async remove(id: number, isAdmin: boolean = false) {
    const product = await this.findOne(id, isAdmin);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({
        where: { productId: id },
      });
      await tx.product.delete({
        where: { id },
      });

      return { message: 'Product deleted successfully' };
    });
  }

  findByCafeInfo(cafeInfoId: number, isAdmin: boolean = false) {
    return this.findAllProductsBySearch({
      cafeInfoId,
    },isAdmin);
  }

  async findDuplicateProductCode(code: string) {
    const count = await this.prisma.product.count({
      where: {
        code: code
      }
    });

    return count > 0;
  }

  async findProductDatabaseByCafeInfoCode(cafeInfoCode: string, limit: number = 50) {

    if (!cafeInfoCode) {
      throw new BadRequestException('Invalid payload');
    }

    const cafeInfo = await this.prisma.cafeInfo.findUnique({
      where: { code: cafeInfoCode }
    });

    if (!cafeInfo) {
      throw new NotFoundException('CafeInfo not found');
    }

    const products = await this.findAllProductsBySearch({
      cafeInfoId: cafeInfo.id,
      limit: limit,
    });

    const categories = new Set(products.products.map(product => product.ProductCategory.id));

    // 카테고리 계층 구조 트리 구성
    const closure = await this.prisma.closureProductCategory.findMany({
      where: {
        descendant: { in: Array.from(categories) }
      },
      orderBy: {
        depth: 'asc'
      }
    });

    closure.forEach(rel => {
      categories.add(rel.ancestor);
    });

    // 카테고리 정보 조회
    const categoryInfos = await this.prisma.productCategory.findMany({
      where: {
        id: { in: Array.from(categories) }
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      }
    });

    // 트리 구조 구성
    const categoryTree = this.buildCategoryTree(Array.from(categories), closure, categoryInfos);

    return { ...products, categoryTree };
  }

  private buildCategoryTree(
    categoryIds: number[], 
    closure: Prisma.ClosureProductCategoryGetPayload<{}>[], 
    categoryInfos: ProductCategoryInfo[]
  ): CategoryTree[] {

    console.log("categoryIds", categoryIds);
    console.log("closure", closure);
    console.log("categoryInfos", categoryInfos);

    const categoryMap = new Map<number, CategoryTree>();
    const rootCategories: CategoryTree[] = [];

    // 카테고리 정보를 Map으로 구성
    categoryInfos.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        descendantIds: []
      });
    });

    // Closure 테이블을 기반으로 트리 구조 구성
    closure.forEach(relation => {
      const parent = categoryMap.get(relation.ancestor);
      const child = categoryMap.get(relation.descendant);
      if (relation.depth === 1) { // 직계 부모-자식 관계
        if (parent && child && parent.id !== child.id) {
          parent.children.push(child);
        }
      }

      if(parent && child && !parent.descendantIds.includes(child.id)) {
        parent.descendantIds.push(child.id);
      }
    });

    // 루트 카테고리들 찾기 (다른 카테고리의 자식이 아닌 것들)
    categoryIds.forEach(id => {
      const category = categoryMap.get(id);
      if (category && !closure.some(rel => 
        rel.descendant === id && rel.depth > 0
      )) {
        rootCategories.push(category);
      }
    });

    rootCategories.forEach(category => {
      category.descendantIds.push(category.id);
    });

    return rootCategories;
  }
}
