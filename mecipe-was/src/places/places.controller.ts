import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreateCafeInfoDto, CreateUcheckedCafeInfoDto } from './dto/create-place.dto';
import { UpdateCafeInoDto } from './dto/update-place.dto';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';
import { Public } from 'src/util/decorators';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) { }

  @Patch('admin/update/:id')
  @UseGuards(AdminAuthGuard)
  updatePlaceByAdmin(@Param('id') id: string, @Body() updateDto: UpdateCafeInoDto) {
    return this.placesService.updatePlaceByAdmin(+id, updateDto);
  }

  @Patch('admin/disable/:id')
  @UseGuards(AdminAuthGuard)
  updateDisablePlaceByAdmin(@Param('id') id: string, @Query('isDisable') isDisable: string) {
    return this.placesService.updateDisablePlaceByAdmin(+id, isDisable === 'true');
  }

  @Delete('admin/delete/:id')
  @UseGuards(AdminAuthGuard)
  deletePlaceByAdmin(@Param('id') id: string) {
    return this.placesService.deletePlaceByAdmin(+id);
  }

  @Post('admin/create')
  @UseGuards(AdminAuthGuard)
  createPlaceByAdmin(@Body() createDto: CreateUcheckedCafeInfoDto) {
    const { regionCategoryId, ...dto } = createDto
    return this.placesService.createPlaceByAdmin(dto, regionCategoryId);
  }

  @Get('admin/:id')
  @UseGuards(AdminAuthGuard)
  findPlaceByAdmin(@Param('id') id: string,) {
    return this.placesService.findPlaceByAdmin(+id);
  }

  //어드민 페이징
  @Get('admin')
  @UseGuards(AdminAuthGuard)
  findAllPlacesByAdmin(
    @Query('page') page: string,
    @Query('take') take: string,
    @Query('searchType') searchType: string,
    @Query('searchText') searchText: string,
    @Query('regionCategoryId') regionCategoryId: string,
    @Query('isDisable') isDisable: string,
  ) {
    return this.placesService.findAllPlacesByAdmin(
      +page,
      +take,
      searchType,
      searchText,
      regionCategoryId ? +regionCategoryId : undefined,
      isDisable === 'true' ? true : false
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
      regionCategoryId ? +regionCategoryId : undefined
    );
  }

  @Get('ids')
  @Public()
  findPlaceIds() {
    return this.placesService.findPlaceIds();
  }

  @Get(':id')
  @Public()
  findOnePlace(@Param('id') id: string,) {
    return this.placesService.findOnePlace(+id);
  }

}
