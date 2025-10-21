import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/global/prisma.service';
// import { ImageuploadService } from 'src/imageupload/imageupload.service';
import { UpsertCafeRealImageListDto } from './dto/upsert-caferealimage.dto';
import { CafeVirtualImage } from 'prisma/basic';
import { RawimageuploadService } from 'src/rawimageupload/rawimageupload.service';

@Injectable()
export class CaferealimagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageuploadService: RawimageuploadService
  ) { }

  findAllCafeVirtualImagesByAdmin() {
    return this.prisma.cafeRealImage.findMany({
      orderBy: {
        priority: 'asc',
        id: 'desc'
      }
    });
  }

  uploadCafeVirtualImagesByAdmin(
    cafeId: number,
    upsertDto: UpsertCafeRealImageListDto
  ) {
    if (upsertDto.create.some(dto => dto.cafeInfoId !== cafeId)) new ConflictException("Error: Wrong CafeInfoId: " + cafeId);

    const createDto = upsertDto.create;
    const updateDto = upsertDto.update;

    return this.prisma.$transaction(async (tx) => {
      try {


        let createdList: CafeVirtualImage[] = [];
        let updatedList: CafeVirtualImage[] = [];

        for (let i = 0; i < createDto.length; i++) {
          // const valid = this.imageuploadService.validUploadUrl(createDto[i].url);

          // if (!valid) throw new ConflictException("Error: Invalid Image: " + createDto[i].url);

          const created = await tx.cafeRealImage.create({
            data: {
              ...createDto[i]
            }
          });

          if (!created) throw new InternalServerErrorException(`Error: Create Image(${i})`)
          createdList.push(created);
        }

        for (let i = 0; i < updateDto.length; i++) {
          // forbid access url
          const { url, ...rest } = updateDto[i];
          const updated = await tx.cafeRealImage.update({
            where: { id: updateDto[i].id },
            data: {
              ...rest
            }
          });
          if (!updated) throw new InternalServerErrorException(`Error: Update Image(${updateDto[i].id}:${i})`);

          updatedList.push(updated);
        }

        return [...createdList, ...updatedList]

      } catch (error) {
        this.imageuploadService.deletImageByUrlList([
          ...createDto.map(dto => dto.url),
          ...updateDto.filter(dto=>dto.url).map(dto=>String(dto.url))
        ]);
        throw error;
      }

    });
  }
}
