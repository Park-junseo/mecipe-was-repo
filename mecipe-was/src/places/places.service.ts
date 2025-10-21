import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateCafeInfoDto } from './dto/create-place.dto';
import { UpdateCafeInoDto } from './dto/update-place.dto';
import { PrismaService } from 'src/global/prisma.service';
import { Prisma } from 'prisma/basic';
import { RawimageuploadService } from 'src/rawimageupload/rawimageupload.service';

@Injectable()
export class PlacesService {

  constructor(
    private prisma: PrismaService,
    private readonly imageuploadService: RawimageuploadService
  ) { }

  /* s:admin */

  async createPlaceByAdmin(createPlaceDto: CreateCafeInfoDto, regionCategoryId: number) {

    const category = await this.prisma.regionCategory.findUnique({ where: { id: regionCategoryId } });

    if (!category) throw new ForbiddenException('지역 카테고리 오류');

    return this.prisma.cafeInfo.create({
      data: {
        ...createPlaceDto,
        regionCategoryId
      },
      include: {
        CafeVirtualLinks: {
          include: {
            CafeVirtualLinkThumbnailImage: true
          }
        },
        CafeVirtualImages: {
          orderBy: {
            priority: 'asc',
          }
        },
        CafeRealImages: {
          orderBy: {
            priority: 'asc',
          }
        },
        CafeThumbnailImages: {
          orderBy: {
            priority: 'asc',
          }
        }
      }
    });
  }

  updatePlaceByAdmin(id: number, updatePlaceDto: UpdateCafeInoDto) {
    return this.prisma.cafeInfo.update({
      where: {
        id,
      },
      data: updatePlaceDto,
    });
  }

  async findAllPlacesByAdmin(
    skip: number,
    take: number,
    searchType: string,
    searchText: string,
    regionCategoryId?: number,
    isDisable = false,
  ) {
    let where: Prisma.CafeInfoWhereInput = {};

    if (searchType === '이름') {
      where.name = { contains: searchText };
    } else if (searchType === '주소') {
      where.address = { contains: searchText };
    } else if (searchType === '사업자번호') {
      where.businessNumber = { contains: searchText };
    } else if (searchType === '사업자명') {
      where.ceoName = { contains: searchText };
    }

    if (regionCategoryId) {
      where.regionCategoryId = {
        in: await this.getDescendantCategoryIds(regionCategoryId)
      }
    }

    where.isDisable = isDisable;

    const count = await this.prisma.cafeInfo.count({
      where: {
        ...where,
      },
    });
    const result =
      count > 0
        ? await this.prisma.cafeInfo.findMany({
          where: where,
          skip: (skip - 1) * take,
          take: take,
          orderBy: {
            id: 'desc',
          },
          include: {
            RegionCategory: true
          }
        })
        : [];

    return { count: count, data: result };
  }

  findPlaceByAdmin(id: number) {
    return this.prisma.cafeInfo.findUnique({
      where: {
        id,
      },
      include: {
        CafeVirtualLinks: {
          include: {
            CafeVirtualLinkThumbnailImage: true
          }
        },
        CafeVirtualImages: {
          orderBy: {
            priority: 'asc',
          }
        },
        CafeRealImages: {
          orderBy: {
            priority: 'asc',
          }
        },
        CafeThumbnailImages: {
          orderBy: {
            priority: 'asc',
          }
        }
      }
    });
  }


  updateDisablePlaceByAdmin(id: number, isDisable: boolean) {
    return this.prisma.cafeInfo.update({
      where: {
        id,
      },
      data: {
        isDisable
      }
    });
  }

  /* e:admin */

  async getDescendantCategoryIds(cafegoryId: number): Promise<number[]> {
    const descendatns = await this.prisma.closureRegionCategory.findMany({
      where: {
        ancestor: cafegoryId
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
  async getAncestorCategoryIds(cafegoryId: number): Promise<number[]> {
    const ancestor = await this.prisma.closureRegionCategory.findMany({
      where: {
        descendant: cafegoryId
      },
      select: {
        ancestor: true,
        depth: true
      },
      orderBy: {
        depth: 'desc'
      }
    });

    return ancestor.map(rel => rel.ancestor)
  }

  async findAllPlacesBySearch(
    skip: number,
    take: number,
    searchText: string,
    regionCategoryId?: number,
  ) {
    let where: Prisma.CafeInfoWhereInput = {};

    if (regionCategoryId) {
      where.regionCategoryId = {
        in: await this.getDescendantCategoryIds(regionCategoryId)
      }
    }

    if (searchText.trim().length > 0) {
      const words = searchText.trim().split(' ');
      where.OR = [...words.map(word => ({
        name: { contains: word.trim() },
      })),
      ...words.map(word => ({
        address: { contains: word.trim() },
      }))];
    }

    console.log("findAllPlacesBySearch", where);

    const count = await this.prisma.cafeInfo.count({
      where: {
        ...where,
      },
    });
    const result =
      count > 0
        ? await this.prisma.cafeInfo.findMany({
          where: where,
          skip: skip,
          take: take,
          orderBy: {
            id: 'desc',
          },
          include: {
            CafeThumbnailImages: {
              where: {
                isDisable: false
              },
              take: 3,
              orderBy: {
                priority: 'asc',
              }
            },
          }
        })
        : [];

    return { count: count, data: result };
  }

  findOnePlace(id: number) {
    return this.prisma.cafeInfo.findFirst({
      where: {
        id: id,
        isDisable: false
      },
      include: {
        CafeVirtualImages: {
          where: {
            isDisable: false
          },
          orderBy: {
            priority: 'asc',
          }
        },
        CafeRealImages: {
          where: {
            isDisable: false
          },
          orderBy: {
            priority: 'asc',
          }
        },
        CafeVirtualLinks: {
          include: {
            CafeVirtualLinkThumbnailImage: true
          },
          where: {
            isDisable: false,
          }
        },
        CafeThumbnailImages: {
          where: {
            isDisable: false
          },
          orderBy: {
            priority: 'asc',
          }
        }
      }
    })
  }

  async deletePlaceByAdmin(id: number) {
    const virtualImages = await this.prisma.cafeVirtualImage.findMany({
      where: {
        cafeInfoId: id
      },
      select: {
        url: true
      }
    });
    if (virtualImages.length > 0) {
      await this.imageuploadService.deletImageByUrlList(virtualImages.map(image => image.url));
      await this.prisma.cafeVirtualImage.deleteMany({
        where: {
          cafeInfoId: id
        }
      });
    }

    const realImages = await this.prisma.cafeRealImage.findMany({
      where: {
        cafeInfoId: id
      },
      select: {
        url: true
      }
    });
    if (realImages.length > 0) {
      await this.imageuploadService.deletImageByUrlList(realImages.map(image => image.url));
      await this.prisma.cafeRealImage.deleteMany({
        where: {
          cafeInfoId: id
        },
      });
    }

    const thumbnail = await this.prisma.cafeThumbnailImage.findMany({
      where: {
        cafeInfoId: id
      },
      select: {
        url: true,
        thumbnailUrl: true
      }
    });
    if (thumbnail.length > 0) {
      await this.imageuploadService.deletImageByUrlList(thumbnail.map(image => image.url));
      await this.imageuploadService.deletImageByUrlList(thumbnail.map(image => image.thumbnailUrl));
      await this.prisma.cafeThumbnailImage.deleteMany({
        where: {
          cafeInfoId: id
        },
      });
    }

    const virtualLinks = await this.prisma.cafeVirtualLink.findMany({
      where: {
        cafeInfoId: id
      },
      select: {
        id: true,
        CafeVirtualLinkThumbnailImage: {
          select: {
            url: true
          }
        }
      },
      // include: {
      //   CafeVirtualLinkThumbnailImage: true
      // }
    });
    if (virtualLinks.length > 0) {
      this.imageuploadService.deletImageByUrl(virtualLinks[0].CafeVirtualLinkThumbnailImage.url);
      await this.prisma.cafeVirtualLinkThumbnailImage.deleteMany({
        where: {
          cafeVirtualLinkId: {
            in: virtualLinks.map(link => link.id)
          }
        }
      })
      await this.prisma.cafeVirtualLink.deleteMany({
        where: {
          cafeInfoId: id
        }
      });
    }

    return this.prisma.cafeInfo.delete({
      where: {
        id
      }
    })
  }

  async findPlaceIds() {
    const count = await this.prisma.cafeInfo.count({
      where: {
        isDisable: false
      }
    });

    if (count === 0) return [];

    return this.prisma.cafeInfo.findMany({
      where: {
        isDisable: false
      },
      select: {
        id: true
      }
    }) ?? []
  }

}
