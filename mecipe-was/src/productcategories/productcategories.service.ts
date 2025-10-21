import { ConflictException, Injectable } from '@nestjs/common';
import { CreateProductcategoryDto } from './dto/create-productcategory.dto';
import { UpdateProductcategoryDto } from './dto/update-productcategory.dto';
import { PrismaService } from 'src/global/prisma.service';
import { Prisma, PrismaPromise, ProductCategory } from 'prisma/basic';

@Injectable()
export class ProductcategoriesService {
  constructor(
    private prisma: PrismaService
  ) { }

  async createProductCategoryByAdmin(createProductcategoryDto: CreateProductcategoryDto, parentCategoryId?: number) {
    if (parentCategoryId) {
      const directChildren = await this.prisma.closureProductCategory.findMany({
        where: {
          ancestor: parentCategoryId,
          depth: 1,
        },
        select: {
          descendant: true,
        },
      });

      const existing = await this.prisma.productCategory.findFirst({
        where: {
          name: createProductcategoryDto.name,
          id: { in: directChildren.map(rel => rel.descendant) },
        },
      });

      if (existing) {
        throw new ConflictException('같은 부모 아래에 동일한 이름의 카테고리가 이미 존재합니다.');
      }
    } else {
      const topLevelAncestors = await this.prisma.closureProductCategory.findMany({
        where: {
          depth: 1,
        },
        select: {
          descendant: true,
        },
      });

      const topLevelIds = new Set(topLevelAncestors.map(rel => rel.descendant));

      const existing = await this.prisma.productCategory.findFirst({
        where: {
          id: {
            notIn: Array.from(topLevelIds), // depth=1 관계가 없는 카테고리 → 최상위
          },
          name: createProductcategoryDto.name,
        },
      });

      if (existing) {
        throw new ConflictException('최상위 카테고리에 동일한 이름이 이미 존재합니다.');
      }
    }

    // 1. 새로운 카테고리 생성
    const newCategory = await this.prisma.productCategory.create({
      data: {
        ...createProductcategoryDto
      },
    });

    const closureRelations: Prisma.ClosureProductCategoryUncheckedCreateInput[] = [];

    // 2. 자기 자신에 대한 관계 추가 (depth = 0)
    closureRelations.push({
      ancestor: newCategory.id,
      descendant: newCategory.id,
      depth: 0,
    });

    // 3. 상위 카테고리가 있다면, 그 조상들과의 관계를 가져와서 갱신
    if (parentCategoryId) {
      const parentAncestors = await this.prisma.closureProductCategory.findMany({
        where: { descendant: parentCategoryId },
      });

      for (const rel of parentAncestors) {
        closureRelations.push({
          ancestor: rel.ancestor,
          descendant: newCategory.id,
          depth: rel.depth + 1,
        });
      }
    }

    // 4. Closure 테이블에 관계 등록
    await this.prisma.closureProductCategory.createMany({
      data: closureRelations,
      skipDuplicates: true,
    });

    return this.findAllProductCategories(true);
  }

  async disableProductCategoryByAdmin(categoryId: number, isDisable: boolean) {
    const closureList = await this.prisma.closureProductCategory.findMany({
      where: {
        ancestor: categoryId
      },
      select: {
        descendant: true
      }
    });

    await this.prisma.productCategory.updateMany({
      where: { id: { in: closureList.map(rel => rel.descendant) } },
      data: {
        isDisable: isDisable
      }
    });

    return this.findAllProductCategories(true);
  }

  async updateProductCategoryByAdmin(
    targetId: number,
    updateDto: UpdateProductcategoryDto,
    newParentId?: number
  ) {
    const isMovingToTopLevel = typeof newParentId === 'number' && newParentId < 0;

    if ((newParentId && newParentId !== targetId) || isMovingToTopLevel) {
      await this.prisma.$transaction(async (tx) => {
        // 1. 기존 Closure 관계 제거
        await tx.closureProductCategory.deleteMany({
          where: { descendant: targetId },
        });

        const newRelations: Prisma.ClosureProductCategoryUncheckedCreateInput[] = [];

        if (!isMovingToTopLevel) {
          // 2. 새로운 조상들과의 관계 생성
          const newAncestors = await tx.closureProductCategory.findMany({
            where: { descendant: newParentId },
          });

          for (const rel of newAncestors) {
            newRelations.push({
              ancestor: rel.ancestor,
              descendant: targetId,
              depth: rel.depth + 1,
            });
          }
        }

        // 3. 자기 자신 관계 추가 (depth = 0)
        newRelations.push({
          ancestor: targetId,
          descendant: targetId,
          depth: 0,
        });

        await tx.closureProductCategory.createMany({
          data: newRelations,
          skipDuplicates: true,
        });

        // 4. ProductCategory 정보 수정
        await tx.productCategory.update({
          where: { id: targetId },
          data: {
            ...updateDto,
          },
        });

        return tx.productCategory.findUnique({ where: { id: targetId } });
      });
    } else {
      // 5. 관계 변경 없이 정보만 수정
      await this.prisma.productCategory.update({
        where: { id: targetId },
        data: {
          ...updateDto,
        },
      });
    }

    // 6. 전체 카테고리 반환
    return this.findAllProductCategories(true);
  }

  async findAllProductCategories(withDisable = false) {
    if (withDisable) {
      return {
        categories: await this.prisma.productCategory.findMany(),
        closure: await this.prisma.closureProductCategory.findMany({
          orderBy: {
            ancestor: 'asc',
          }
        })
      };
    } else {
      const enabledCategories = await this.prisma.productCategory.findMany({
        where: {
          isDisable: false
        },
        select: {
          id: true,
          name: true,
          description: true,
          code: true,
          isDisable: true
        }
      }) ?? [];

      const closure = await this.prisma.closureProductCategory.findMany({
        where: {
          descendant: {
            in: enabledCategories.map(category => category.id)
          }
        },
        orderBy: {
          ancestor: 'asc',
        }
      }) ?? [];

      return { categories: enabledCategories, closure };
    }
  }

  async findChildProductCategoriesByAdmin(parentId?: number) {
    if (parentId) {
      // 바로 아래 자식 카테고리 (depth = 1)
      const directChildren = await this.prisma.closureProductCategory.findMany({
        where: {
          ancestor: parentId,
          depth: 1,
        },
        select: { descendant: true },
      });

      const childIds = directChildren.map(rel => rel.descendant);

      return await this.prisma.productCategory.findMany({
        where: {
          id: { in: childIds },
        },
        orderBy: { name: 'asc' },
      }) ?? [];
    } else {
      // 최상위 카테고리: 다른 카테고리의 자손이 아닌 것
      const allDescendants = await this.prisma.closureProductCategory.findMany({
        where: {
          depth: 1,
        },
        select: { descendant: true },
      });

      const descendantSet = new Set(allDescendants.map(rel => rel.descendant));

      const topLevelCategories = await this.prisma.productCategory.findMany({
        where: {
          id: {
            notIn: Array.from(descendantSet),
          },
        },
        orderBy: { name: 'asc' },
      }) ?? [];

      return topLevelCategories;
    }
  }

  async findAncestorCategories(categoryId: number) {
    const closure = await this.prisma.closureProductCategory.findMany({
      where: {
        descendant: categoryId
      },
      orderBy: {
        depth: 'desc'
      },
      select: {
        ancestor: true
      }
    });

    return this.prisma.productCategory.findMany({
      where: {
        id: {
          in: closure.map(rel => rel.ancestor)
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        code: true
      }
    }) ?? [];
  }

  async findProductCategoryById(id: number) {
    return this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        Products: true,
        DescendantCategories: true,
        AncestorCategories: true
      }
    });
  }

  async findDuplicateProductCategoryCode(code: string) {
    const count = await this.prisma.productCategory.count({
      where: {
        code: code
      }
    });

    return count > 0;
  }
}
