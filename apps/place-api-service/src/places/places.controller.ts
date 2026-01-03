import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import {
  CreateCafeInfoDto,
  CreateUcheckedCafeInfoDto,
} from './dto/create-place.dto';
import { UpdateCafeInoDto } from './dto/update-place.dto';
import { Public, RequireRole } from '../util/decorators';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) { }

  @Patch('admin/update/:id')
  @RequireRole('ADMIN')
  updatePlaceByAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateCafeInoDto,
  ) {
    return this.placesService.updatePlaceByAdmin(+id, updateDto);
  }

  @Patch('admin/disable/:id')
  @RequireRole('ADMIN')
  updateDisablePlaceByAdmin(
    @Param('id') id: string,
    @Query('isDisable') isDisable: string,
  ) {
    return this.placesService.updateDisablePlaceByAdmin(
      +id,
      isDisable === 'true',
    );
  }

  @Delete('admin/delete/:id')
  @RequireRole('ADMIN')
  deletePlaceByAdmin(@Param('id') id: string) {
    return this.placesService.deletePlaceByAdmin(+id);
  }

  @Post('admin/create')
  @RequireRole('ADMIN')
  createPlaceByAdmin(@Body() createDto: CreateUcheckedCafeInfoDto) {
    const { regionCategoryId, ...dto } = createDto;
    return this.placesService.createPlaceByAdmin(dto, regionCategoryId);
  }

  //어드민 페이징(Cursor)
  @Get('admin/pagination')
  @RequireRole('ADMIN')
  findAllPlacesPaginationCursor(
    @Query('page') page: string,
    @Query('take') limit: string,
    @Query('after') after: string,
    @Query('searchType') searchType: string,
    @Query('searchText') searchText: string,
    @Query('regionCategoryId') regionCategoryId: string,
    @Query('isDisable') isDisable: string,
  ) {
    return this.placesService.findAllPlacesPaginationCursor(
      {
        page: page ? +page : undefined,
        limit: limit ? +limit : undefined,
        after: after ? after : undefined,
      },
      searchType,
      searchText,
      regionCategoryId ? +regionCategoryId : undefined,
      isDisable ? isDisable === 'true' : isDisable === 'false' ? false : undefined,
    );
  }

  @Get('admin/:id')
  @RequireRole('ADMIN')
  findPlaceByAdmin(@Param('id') id: string) {
    return this.placesService.findPlaceByAdmin(+id);
  }

  //어드민 페이징(Offset)
  @Get('admin')
  @RequireRole('ADMIN')
  findAllPlacesPaginationOffset(
    @Query('page') page: string,
    @Query('take') take: string,
    @Query('searchType') searchType: string,
    @Query('searchText') searchText: string,
    @Query('regionCategoryId') regionCategoryId: string,
    @Query('isDisable') isDisable: string,
  ) {
    return this.placesService.findAllPlacesPaginationOffset(
      +page,
      +take,
      searchType,
      searchText,
      regionCategoryId ? +regionCategoryId : undefined,
      isDisable ? isDisable === 'true' : isDisable === 'false' ? false : undefined,
    );
  }

  @Get('search')
  @Public()
  findAllPlacesBySearch(
    @Query('skip') skip: string,
    @Query('take') take: string,
    @Query('searchText') searchText: string,
    @Query('regionCategoryId') regionCategoryId: string,
  ) {
    return this.placesService.findAllPlacesBySearch(
      skip ? +skip : undefined,
      take ? +take : undefined,
      searchText,
      regionCategoryId ? +regionCategoryId : undefined,
    );
  }

  @Get('ids')
  @Public()
  findPlaceIds() {
    return this.placesService.findPlaceIds();
  }

  @Get(':id')
  @Public()
  findOnePlace(@Param('id') id: string) {
    return this.placesService.findOnePlace(+id);
  }
}
