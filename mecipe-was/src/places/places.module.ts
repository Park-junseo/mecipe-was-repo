import { Module } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { PrismaService } from 'src/global/prisma.service';
import { RawimageuploadModule } from 'src/rawimageupload/rawimageupload.module';
import { PlacesResolver } from './graphql/resolvers/places.resolver';

@Module({
  imports: [RawimageuploadModule],
  controllers: [PlacesController],
  providers: [PlacesService, PrismaService, PlacesResolver],
})
export class PlacesModule {}
