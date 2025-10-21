import { ConflictException, Injectable } from '@nestjs/common';
import { CafeVirtualLinkResult, CreateCafeVirtaulLinkWithImageDto, CreateCafeVirtaulLinkWithImageListDto } from './dto/create-cafevirtuallink.dto';
import { PrismaService } from 'src/global/prisma.service';
// import { ImageuploadService } from 'src/imageupload/imageupload.service';
import { UpdateCafeVirtaulLinkThumbnailImageDto, UpdateCafevirtuallinkDto } from './dto/update-cafevirtuallink.dto';
import { RawimageuploadService } from 'src/rawimageupload/rawimageupload.service';
import { CafeVirtualLink, CafeVirtualLinkThumbnailImage } from 'prisma/basic';

@Injectable()
export class CafevirtuallinksService {
  constructor(private readonly prisma: PrismaService, private readonly imageuploadService: RawimageuploadService) { }

  async createCafeVirtualLinkByAdmin(cafeId: number, createDto: CreateCafeVirtaulLinkWithImageDto): Promise<CafeVirtualLinkResult> {
    try {

      return await this.prisma.$transaction(async (tx) => {

        // const valid = this.imageuploadService.validUploadUrl(createDto.thumbnailImage.url);

        // if (!valid) throw new ConflictException("Error: Invalid Image: " + createDto.thumbnailImage.url);

        if (createDto.link.isDisable === true) throw new ConflictException("Error: Create Donot Disable Link: " + createDto.link.name);

        const createdLink = await tx.cafeVirtualLink.create({
          data: {
            ...createDto.link,
            cafeInfoId: cafeId
          }
        });

        const createdThumbnailImage = await tx.cafeVirtualLinkThumbnailImage.create({
          data: {
            ...createDto.thumbnailImage,
            cafeVirtualLinkId: createdLink.id
          }
        });

        return {
          ...createdLink,
          CafeVirtualLinkThumbnailImage: createdThumbnailImage
        };
      });
    } catch (e) {
      this.imageuploadService.deletImageByUrl(createDto.thumbnailImage.url);
      throw e;
    }
  };

  async createCafeVirtualLinkListByAdmin(cafeId: number, createListDto: CreateCafeVirtaulLinkWithImageListDto) {

    try {

      return await this.prisma.$transaction(async (tx) => {

        let resultList: (CafeVirtualLink & { CafeVirtualLinkThumbnailImage: CafeVirtualLinkThumbnailImage })[
        ] = [];

        for (let i = 0; i < createListDto.create.length; i++) {
          const createDto = createListDto.create[i];

          // const valid = this.imageuploadService.validUploadUrl(createDto.thumbnailImage.url);

          // if (!valid) throw new ConflictException("Error: Invalid Image: " + createDto.thumbnailImage.url);

          if (createDto.link.isDisable === true) throw new ConflictException("Error: Create Donot Disable Link: " + createDto.link.name);

          const createdLink = await tx.cafeVirtualLink.create({
            data: {
              ...createDto.link,
              cafeInfoId: cafeId
            }
          });

          const createdThumbnailImage = await tx.cafeVirtualLinkThumbnailImage.create({
            data: {
              ...createDto.thumbnailImage,
              cafeVirtualLinkId: createdLink.id
            }
          });

          resultList.push({
            ...createdLink,
            CafeVirtualLinkThumbnailImage: createdThumbnailImage
          });

          return resultList;
        }
      });
    } catch (e) {
      createListDto.create.forEach(createDto => {
        this.imageuploadService.deletImageByUrl(createDto.thumbnailImage.url);
      })

      throw e;
    }

  }

  async updateCafeVirtualLinkByAdmin(id: number, updateDto: UpdateCafevirtuallinkDto) {
    if (updateDto.type && typeof updateDto.type === "string") {
      const equalTypeCount = await this.prisma.cafeVirtualLink.count({ where: { type: updateDto.type } })
      if (equalTypeCount > 0) {
        throw new ConflictException("Error: Duplicate Type: " + updateDto.type)
      }
    }


    return this.prisma.cafeVirtualLink.update({
      data: updateDto,
      where: {
        id
      },
    })
  }

  async updateCafeVirtualLinkThumbnailImageByAdmin(id: number, updateDto: UpdateCafeVirtaulLinkThumbnailImageDto) {
    //control access url
    const { url, ...rest } = updateDto;

    const passed = await this.prisma.cafeVirtualLinkThumbnailImage.findUnique({ where: { id } });
    if (!passed) throw new ConflictException("Error CafeVirtualLinkThumbanilImage :" + id);

    if (url && typeof url === 'string' && url != passed.url) {
      // const valid = this.imageuploadService.validUploadUrl(url);
      // if (!valid) throw new ConflictException("Error: Invalid Image: " + url);

      const isDeleted = await this.imageuploadService.deletImageByUrl(passed.url);
      if (!isDeleted) throw new ConflictException("Error Delete Image: " + passed.url);
    }

    return this.prisma.cafeVirtualLinkThumbnailImage.update({
      data: {
        ...rest
      },
      where: {
        id
      }
    })
  }

  findAllCafeVirtualLinksByAdmin() {
    return this.prisma.cafeVirtualLink.findMany({
      include: {
        CafeVirtualLinkThumbnailImage: true
      }
    });
  }
}
