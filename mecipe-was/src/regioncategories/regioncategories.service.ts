import { ConflictException, Injectable } from '@nestjs/common';
import { CreateRegioncategoryDto } from './dto/create-regioncategory.dto';
import { UpdateRegioncategoryDto } from './dto/update-regioncategory.dto';
import { PrismaService } from 'src/global/prisma.service';
import { Prisma, PrismaPromise, RegionCategory } from 'prisma/basic';

@Injectable()
export class RegioncategoriesService {
  constructor(
    private prisma: PrismaService

  ) { }

  async createRegionCategoryByAdmin(createRegioncategoryDto: CreateRegioncategoryDto, parentCategoryId?: number) {

    if (parentCategoryId) {
      const directChildren = await this.prisma.closureRegionCategory.findMany({
        where: {
          ancestor: parentCategoryId,
          depth: 1,
        },
        select: {
          descendant: true,
        },
      });

      const existing = await this.prisma.regionCategory.findFirst({
        where: {
          name: createRegioncategoryDto.name,
          id: { in: directChildren.map(rel => rel.descendant) },
        },
      });

      if (existing) {
        throw new ConflictException('같은 부모 아래에 동일한 이름의 카테고리가 이미 존재합니다.');
      }
    } else {
      const topLevelAncestors = await this.prisma.closureRegionCategory.findMany({
        where: {
          depth: 1,
        },
        select: {
          descendant: true,
        },
      });

      const topLevelIds = new Set(topLevelAncestors.map(rel => rel.descendant));

      const existing = await this.prisma.regionCategory.findFirst({
        where: {
          id: {
            notIn: Array.from(topLevelIds), // depth=1 관계가 없는 카테고리 → 최상위
          },
          name: createRegioncategoryDto.name,
        },
      });

      if (existing) {
        throw new ConflictException('최상위 카테고리에 동일한 이름이 이미 존재합니다.');
      }
    }

    // 1. 새로운 카테고리 생성
    const newCategory = await this.prisma.regionCategory.create({
      data: {
        ...createRegioncategoryDto
      },
    });

    const closureRelations: Prisma.ClosureRegionCategoryUncheckedCreateInput[] = [];

    // 2. 자기 자신에 대한 관계 추가 (depth = 0)
    closureRelations.push({
      ancestor: newCategory.id,
      descendant: newCategory.id,
      depth: 0,
    });

    // 3. 상위 카테고리가 있다면, 그 조상들과의 관계를 가져와서 갱신
    if (parentCategoryId) {
      const parentAncestors = await this.prisma.closureRegionCategory.findMany({
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
    await this.prisma.closureRegionCategory.createMany({
      data: closureRelations,
      skipDuplicates: true,
    });

    return this.findAllRegionCategories(true);
  }

  async disbleRegionCategoryByAdmin(categoryId: number, isDisable: boolean) {

    const closueList = await this.prisma.closureRegionCategory.findMany({
      where: {
        ancestor: categoryId
      },
      select: {
        descendant: true
      }
    });

    await this.prisma.regionCategory.updateMany({
      where: { id: { in: closueList.map(rel => rel.descendant) } },
      data: {
        isDisable: isDisable
      }
    })

    return this.findAllRegionCategories(true);

  }

  async updateRegionCategoryByAdmin(
    targetId: number,
    updateDto: UpdateRegioncategoryDto,
    newParentId?: number
  ) {
    const isMovingToTopLevel = typeof newParentId === 'number' && newParentId < 0;

    if ((newParentId && newParentId !== targetId) || isMovingToTopLevel) {
      await this.prisma.$transaction(async (tx) => {
        // 1. 기존 Closure 관계 제거
        await tx.closureRegionCategory.deleteMany({
          where: { descendant: targetId },
        });

        const newRelations: Prisma.ClosureRegionCategoryUncheckedCreateInput[] = [];

        if (!isMovingToTopLevel) {
          // 2. 새로운 조상들과의 관계 생성
          const newAncestors = await tx.closureRegionCategory.findMany({
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

        await tx.closureRegionCategory.createMany({
          data: newRelations,
          skipDuplicates: true,
        });

        // 4. RegionCategory 정보 수정
        await tx.regionCategory.update({
          where: { id: targetId },
          data: {
            ...updateDto,
          },
        });

        return tx.regionCategory.findUnique({ where: { id: targetId } });
      });
    } else {
      // 5. 관계 변경 없이 정보만 수정
      await this.prisma.regionCategory.update({
        where: { id: targetId },
        data: {
          ...updateDto,
        },
      });
    }

    // 6. 전체 카테고리 반환
    return this.findAllRegionCategories(true);
  }
  async findAllRegionCategories(withDisable = false) {
    if (withDisable) {
      return {
        categories: await this.prisma.regionCategory.findMany(),
        closure: await this.prisma.closureRegionCategory.findMany({
          orderBy: {
            ancestor: 'asc',
          }
        })
      }
    } else {
      const enabledCategories = await this.prisma.regionCategory.findMany({
        where: {
          isDisable: false
        },
        select: {
          id: true,
          name: true,
          isDisable: true,
          govermentType: true
        }
      }) ?? []

      const closure = await this.prisma.closureRegionCategory.findMany({
        where: {
          descendant: {
            in: enabledCategories.map(category => category.id)
          }
        },
        orderBy: {
          ancestor: 'asc',
          // depth: 'asc',
        }
      }) ?? []

      return { categories: enabledCategories, closure };
    }

  }

  async findChildRegionCategoriesByAdmin(parentId?: number) {
    if (parentId) {
      // 바로 아래 자식 카테고리 (depth = 1)
      const directChildren = await this.prisma.closureRegionCategory.findMany({
        where: {
          ancestor: parentId,
          depth: 1,
        },
        select: { descendant: true },
      });

      const childIds = directChildren.map(rel => rel.descendant);

      return await this.prisma.regionCategory.findMany({
        where: {
          id: { in: childIds },
        },
        orderBy: { name: 'asc' },
      }) ?? [];
    } else {
      // 최상위 카테고리: 다른 카테고리의 자손이 아닌 것
      const allDescendants = await this.prisma.closureRegionCategory.findMany({
        where: {
          depth: 1,
        },
        select: { descendant: true },
      });

      const descendantSet = new Set(allDescendants.map(rel => rel.descendant));

      const topLevelCategories = await this.prisma.regionCategory.findMany({
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

  async findAncestorCategories(categoryId:number) {
    const closure = await this.prisma.closureRegionCategory.findMany({
      where: {
        descendant: categoryId
      },
      orderBy:{
        depth:'desc'
      },
      select: {
        ancestor: true
      }
    });

    return this.prisma.regionCategory.findMany({
      where: {
        id: {
          in: closure.map(rel => rel.ancestor)
        }
      },
      select:{
        id:true,
        name:true,
        govermentType:true
      }
    }) ?? []

  }


}
