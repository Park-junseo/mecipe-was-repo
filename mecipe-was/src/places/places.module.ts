import { Module } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { PrismaService } from 'src/global/prisma.service';
import { RawimageuploadModule } from 'src/rawimageupload/rawimageupload.module';

@Module({
  imports: [
    RawimageuploadModule
  ],
  controllers: [PlacesController],
  providers: [PlacesService, PrismaService]
})
export class PlacesModule { }
