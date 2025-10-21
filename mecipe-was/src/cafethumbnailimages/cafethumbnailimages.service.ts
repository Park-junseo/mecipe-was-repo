import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/global/prisma.service';
import { UpsertCafethumbnailimageListDto } from './dto/upsert-cafethumbnailimage.dto';
// import { ImageuploadService } from 'src/imageupload/imageupload.service';
import { CafeThumbnailImage } from 'prisma/basic';
import { RawimageuploadService } from 'src/rawimageupload/rawimageupload.service';

@Injectable()
export class CafethumbnailimagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageuploadService: RawimageuploadService
  ) { }

  findAllCafeThumbnailImagesByAdmin() {
    return this.prisma.cafeThumbnailImage.findMany({
      orderBy: {
        priority: 'asc',
        id: 'desc'
      }
    });
  }

  uploadCafeThumnailImagesByAdmin(
    cafeId: number,
    upsertDto: UpsertCafethumbnailimageListDto
  ) {
    if (upsertDto.create.some(dto => dto.cafeInfoId !== cafeId)) new ForbiddenException("Error: Wrong CafeInfoId: " + cafeId);

    const createDto = upsertDto.create;
    const updateDto = upsertDto.update;

    return this.prisma.$transaction(async (tx) => {

      try {

        let createdList: CafeThumbnailImage[] = [];
        let updatedList: CafeThumbnailImage[] = [];

        for (let i = 0; i < createDto.length; i++) {
          // const valid = this.imageuploadService.validUploadUrl(createDto[i].url);

          // if (!valid) throw new ForbiddenException("Error: Invalid Image: " + createDto[i].url);

          const created = await tx.cafeThumbnailImage.create({
            data: {
              ...createDto[i]
            }
          });

          if (!created) throw new ForbiddenException(`Error: Create Image(${i})`)
          createdList.push(created);
        }

        for (let i = 0; i < updateDto.length; i++) {
          // forbid access url
          const { url, ...rest } = updateDto[i];
          const updated = await tx.cafeThumbnailImage.update({
            where: { id: updateDto[i].id },
            data: {
              ...rest
            }
          });
          if (!updated) throw new ForbiddenException(`Error: Update Image(${updateDto[i].id}:${i})`);

          updatedList.push(updated);
        }

        return [...createdList, ...updatedList]

      } catch (error) {
        this.imageuploadService.deletImageByUrlList([
          ...createDto.map(dto => dto.url),
          ...updateDto.filter(dto => dto.url).map(dto => String(dto.url)),
          ...createDto.map(dto => dto.thumbnailUrl),
          ...updateDto.filter(dto => dto.thumbnailUrl).map(dto => String(dto.thumbnailUrl))
        ]);
        throw error;
      }
    });
  }
}
