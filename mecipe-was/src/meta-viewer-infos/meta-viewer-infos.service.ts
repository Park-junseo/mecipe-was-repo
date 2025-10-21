import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMetaViewerInfoDto } from './dto/create-meta-viewer-info.dto';
import { UpdateMetaViewerInfoDto } from './dto/update-meta-viewer-info.dto';
import { CreateMetaViewerMapDto } from './dto/create-meta-viewer-map.dto';
import { UpdateMetaViewerMapDto } from './dto/update-meta-viewer-map.dto';
import { CreateMetaViewerActiveMapDto } from './dto/create-meta-viewer-active-map.dto';
import { UpdateMetaViewerActiveMapDto } from './dto/update-meta-viewer-active-map.dto';
import { SearchMetaViewerInfoDto } from './dto/search-meta-viewer-info.dto';
import { PrismaService } from 'src/global/prisma.service';
import { MetaMapType, Prisma } from 'prisma/basic';

@Injectable()
export class MetaViewerInfosService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== MetaViewerInfo 관련 ==========

  async createMetaViewerInfo(createDto: CreateMetaViewerInfoDto) {
    // CafeInfo 존재 확인
    const cafeInfo = await this.prisma.cafeInfo.findUnique({
      where: { id: createDto.cafeInfoId },
    });

    if (!cafeInfo) {
      throw new NotFoundException('CafeInfo not found');
    }

    // code 중복 확인
    const existingInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { code: createDto.code },
    });

    if (existingInfo) {
      throw new BadRequestException('Code already exists');
    }

    // 트랜잭션으로 MetaViewerInfo, Maps, ActiveMap 한 번에 생성
    return this.prisma.$transaction(async (tx) => {
      // 1. MetaViewerInfo 생성
      const metaViewerInfo = await tx.metaViewerInfo.create({
        data: {
          code: createDto.code,
          isDisable: createDto.isDisable ?? false,
          worldData: createDto.worldData,
          CafeInfo: {
            connect: { id: createDto.cafeInfoId },
          },
        },
      });

      // 2. RenderMap 생성
      const renderMap = await tx.metaViewerMap.create({
        data: {
          type: MetaMapType.RENDER,
          url: createDto.activeRenderMap.url,
          size: createDto.activeRenderMap.size,
          isDraco: createDto.activeRenderMap.isDraco,
          version: createDto.activeRenderMap.version ?? 0,
          contentKey: createDto.activeRenderMap.contentKey,
          MetaViewerInfo: {
            connect: { id: metaViewerInfo.id },
          },
        },
      });

      // 3. ColliderMap 생성
      const colliderMap = await tx.metaViewerMap.create({
        data: {
          type: MetaMapType.COLLIDER,
          url: createDto.activeColliderMap.url,
          size: createDto.activeColliderMap.size,
          isDraco: createDto.activeColliderMap.isDraco,
          version: createDto.activeColliderMap.version ?? 0,
          MetaViewerInfo: {
            connect: { id: metaViewerInfo.id },
          },
        },
      });

      // 4. ActiveMap 생성
      await tx.metaViewerActiveMap.create({
        data: {
          MetaViewerInfo: {
            connect: { id: metaViewerInfo.id },
          },
          ActiveRenderMap: {
            connect: { id: renderMap.id },
          },
          ActiveColliderMap: {
            connect: { id: colliderMap.id },
          },
        },
      });

      // 5. 전체 데이터 조회 후 반환
      return tx.metaViewerInfo.findUnique({
        where: { id: metaViewerInfo.id },
        include: {
          CafeInfo: true,
          MetaViewerMaps: true,
          ActiveMaps: {
            include: {
              ActiveRenderMap: true,
              ActiveColliderMap: true,
            },
          },
        },
      });
    });
  }

  async updateMetaViewerInfo(id: number, updateDto: UpdateMetaViewerInfoDto) {
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { id },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    // code 중복 확인 (자기 자신 제외)
    if (updateDto.code) {
      const existingInfo = await this.prisma.metaViewerInfo.findUnique({
        where: { code: updateDto.code },
      });

      if (existingInfo && existingInfo.id !== id) {
        throw new BadRequestException('Code already exists');
      }
    }

    // cafeInfoId 변경 시 존재 확인
    if (updateDto.cafeInfoId) {
      const cafeInfo = await this.prisma.cafeInfo.findUnique({
        where: { id: updateDto.cafeInfoId },
      });

      if (!cafeInfo) {
        throw new NotFoundException('CafeInfo not found');
      }
    }

    // 업데이트 데이터 구성
    const updateData: Prisma.MetaViewerInfoUpdateInput = {};

    if (updateDto.code !== undefined) updateData.code = updateDto.code;
    if (updateDto.isDisable !== undefined)
      updateData.isDisable = updateDto.isDisable;
    if (updateDto.worldData !== undefined)
      updateData.worldData = updateDto.worldData;
    if (updateDto.cafeInfoId !== undefined) {
      updateData.CafeInfo = { connect: { id: updateDto.cafeInfoId } };
    }

    return this.prisma.metaViewerInfo.update({
      where: { id },
      data: updateData,
      include: {
        CafeInfo: true,
        ActiveMaps: {
          include: {
            ActiveRenderMap: true,
            ActiveColliderMap: true,
          },
        },
      },
    });
  }

  async findAllMetaViewerInfos(searchDto: SearchMetaViewerInfoDto) {
    const { page = 1, limit = 10, ...searchParams } = searchDto;
    const skip = (page - 1) * limit;

    const where: Prisma.MetaViewerInfoWhereInput = {};

    if (searchParams.cafeInfoId) {
      where.cafeInfoId = searchParams.cafeInfoId;
    }

    if (searchParams.isDisable !== undefined) {
      where.isDisable = searchParams.isDisable;
    }

    if (searchParams.searchText) {
      if (searchParams.searchType === 'code') {
        where.code = { contains: searchParams.searchText, mode: 'insensitive' };
      }
    }

    const total = await this.prisma.metaViewerInfo.count({ where });

    const metaViewerInfos =
      total > 0
        ? await this.prisma.metaViewerInfo.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              CafeInfo: true,
              ActiveMaps: {
                include: {
                  ActiveRenderMap: true,
                  ActiveColliderMap: true,
                },
              },
            },
          })
        : [];

    return {
      metaViewerInfos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneMetaViewerInfo(id: number) {
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { id },
      include: {
        CafeInfo: true,
        ActiveMaps: {
          include: {
            ActiveRenderMap: true,
            ActiveColliderMap: true,
          },
        },
      },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    return metaViewerInfo;
  }

  async findOneByCode(code: string) {
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { code },
      include: {
        CafeInfo: true,
        ActiveMaps: {
          include: {
            ActiveRenderMap: true,
            ActiveColliderMap: true,
          },
        },
      },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    // isDisable이 true이거나 ActiveMaps가 없으면 에러
    if (metaViewerInfo.isDisable) {
      throw new BadRequestException('MetaViewerInfo is disabled');
    }

    if (!metaViewerInfo.ActiveMaps) {
      throw new BadRequestException('No active maps configured');
    }

    return metaViewerInfo;
  }

  async removeMetaViewerInfo(id: number) {
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { id },
      include: {
        ActiveMaps: true,
      },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // ActiveMaps가 있으면 먼저 삭제
      if (metaViewerInfo.ActiveMaps) {
        await tx.metaViewerActiveMap.delete({
          where: { metaViewerInfoId: id },
        });
      }

      await tx.metaViewerInfo.delete({
        where: { id },
      });

      return { message: 'MetaViewerInfo deleted successfully' };
    });
  }

  // ========== MetaViewerMap 관련 ==========

  async createMetaViewerMap(
    metaViewerInfoId: number,
    createDto: CreateMetaViewerMapDto,
  ) {
    // MetaViewerInfo 존재 확인
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { id: metaViewerInfoId },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    return this.prisma.metaViewerMap.create({
      data: {
        type: createDto.type,
        url: createDto.url,
        size: createDto.size,
        isDraco: createDto.isDraco,
        version: createDto.version ?? 0,
        contentKey: createDto.contentKey,
        MetaViewerInfo: {
          connect: { id: metaViewerInfoId },
        },
      },
    });
  }

  async updateMetaViewerMap(mapId: number, updateDto: UpdateMetaViewerMapDto) {
    const map = await this.prisma.metaViewerMap.findUnique({
      where: { id: mapId },
      include: {
        ActiveRenderFor: true,
        ActiveColliderFor: true,
      },
    });

    if (!map) {
      throw new NotFoundException('MetaViewerMap not found');
    }

    // type 변경 시 ActiveMap 참조 확인
    if (updateDto.type && updateDto.type !== map.type) {
      // RENDER로 변경하려는데 ActiveColliderFor가 있는 경우
      if (
        updateDto.type === MetaMapType.RENDER &&
        map.ActiveColliderFor.length > 0
      ) {
        throw new BadRequestException(
          'Cannot change type to RENDER: map is used as active collider map',
        );
      }

      // COLLIDER로 변경하려는데 ActiveRenderFor가 있는 경우
      if (
        updateDto.type === MetaMapType.COLLIDER &&
        map.ActiveRenderFor.length > 0
      ) {
        throw new BadRequestException(
          'Cannot change type to COLLIDER: map is used as active render map',
        );
      }
    }

    return this.prisma.metaViewerMap.update({
      where: { id: mapId },
      data: updateDto,
    });
  }

  async removeMetaViewerMap(mapId: number) {
    const map = await this.prisma.metaViewerMap.findUnique({
      where: { id: mapId },
      include: {
        ActiveRenderFor: true,
        ActiveColliderFor: true,
      },
    });

    if (!map) {
      throw new NotFoundException('MetaViewerMap not found');
    }

    // ActiveMap에서 사용 중이면 삭제 불가
    if (map.ActiveRenderFor.length > 0 || map.ActiveColliderFor.length > 0) {
      throw new BadRequestException(
        'Cannot delete map: it is referenced by active maps',
      );
    }

    await this.prisma.metaViewerMap.delete({
      where: { id: mapId },
    });

    return { message: 'MetaViewerMap deleted successfully' };
  }

  async findAllMaps(metaViewerInfoId: number) {
    // MetaViewerInfo 존재 확인
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { id: metaViewerInfoId },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    // 모든 맵 반환 (추후 필터링 가능)
    return this.prisma.metaViewerMap.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== MetaViewerActiveMap 관련 ==========

  async createMetaViewerActiveMap(createDto: CreateMetaViewerActiveMapDto) {
    // MetaViewerInfo 존재 확인
    const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
      where: { id: createDto.metaViewerInfoId },
      include: {
        ActiveMaps: true,
      },
    });

    if (!metaViewerInfo) {
      throw new NotFoundException('MetaViewerInfo not found');
    }

    // 이미 ActiveMap이 존재하면 에러
    if (metaViewerInfo.ActiveMaps) {
      throw new BadRequestException(
        'ActiveMap already exists for this MetaViewerInfo',
      );
    }

    // ActiveRenderMap 확인 (RENDER 타입이어야 함)
    const renderMap = await this.prisma.metaViewerMap.findUnique({
      where: { id: createDto.activeRenderMapId },
    });

    if (!renderMap) {
      throw new NotFoundException('Render map not found');
    }

    if (renderMap.type !== MetaMapType.RENDER) {
      throw new BadRequestException('activeRenderMap must be of type RENDER');
    }

    // ActiveColliderMap 확인 (COLLIDER 타입이어야 함)
    const colliderMap = await this.prisma.metaViewerMap.findUnique({
      where: { id: createDto.activeColliderMapId },
    });

    if (!colliderMap) {
      throw new NotFoundException('Collider map not found');
    }

    if (colliderMap.type !== MetaMapType.COLLIDER) {
      throw new BadRequestException(
        'activeColliderMap must be of type COLLIDER',
      );
    }

    return this.prisma.metaViewerActiveMap.create({
      data: {
        MetaViewerInfo: {
          connect: { id: createDto.metaViewerInfoId },
        },
        ActiveRenderMap: {
          connect: { id: createDto.activeRenderMapId },
        },
        ActiveColliderMap: {
          connect: { id: createDto.activeColliderMapId },
        },
      },
      include: {
        MetaViewerInfo: true,
        ActiveRenderMap: true,
        ActiveColliderMap: true,
      },
    });
  }

  async updateMetaViewerActiveMap(
    activeMapId: number,
    updateDto: UpdateMetaViewerActiveMapDto,
  ) {
    const activeMap = await this.prisma.metaViewerActiveMap.findUnique({
      where: { id: activeMapId },
    });

    if (!activeMap) {
      throw new NotFoundException('MetaViewerActiveMap not found');
    }

    // activeRenderMapId 변경 시 타입 확인
    if (updateDto.activeRenderMapId) {
      const renderMap = await this.prisma.metaViewerMap.findUnique({
        where: { id: updateDto.activeRenderMapId },
      });

      if (!renderMap) {
        throw new NotFoundException('Render map not found');
      }

      if (renderMap.type !== MetaMapType.RENDER) {
        throw new BadRequestException('activeRenderMap must be of type RENDER');
      }
    }

    // activeColliderMapId 변경 시 타입 확인
    if (updateDto.activeColliderMapId) {
      const colliderMap = await this.prisma.metaViewerMap.findUnique({
        where: { id: updateDto.activeColliderMapId },
      });

      if (!colliderMap) {
        throw new NotFoundException('Collider map not found');
      }

      if (colliderMap.type !== MetaMapType.COLLIDER) {
        throw new BadRequestException(
          'activeColliderMap must be of type COLLIDER',
        );
      }
    }

    return this.prisma.metaViewerActiveMap.update({
      where: { id: activeMapId },
      data: updateDto,
      include: {
        MetaViewerInfo: true,
        ActiveRenderMap: true,
        ActiveColliderMap: true,
      },
    });
  }

  async removeMetaViewerActiveMap(activeMapId: number) {
    const activeMap = await this.prisma.metaViewerActiveMap.findUnique({
      where: { id: activeMapId },
    });

    if (!activeMap) {
      throw new NotFoundException('MetaViewerActiveMap not found');
    }

    await this.prisma.metaViewerActiveMap.delete({
      where: { id: activeMapId },
    });

    return { message: 'MetaViewerActiveMap deleted successfully' };
  }

  async findAllMetaViewerCodes() {
    return this.prisma.metaViewerInfo.findMany({
      where: { isDisable: false },
      select: { code: true },
    });
  }

  async findOneMetaViewerInfoByCode(code: string, isDisable = false) {
    return this.prisma.metaViewerInfo.findFirst({
      where: { code, isDisable },
      include: {
        CafeInfo: true,
        ActiveMaps: {
          include: {
            ActiveRenderMap: true,
            ActiveColliderMap: true,
          },
        },
      },
    });
  }
}
