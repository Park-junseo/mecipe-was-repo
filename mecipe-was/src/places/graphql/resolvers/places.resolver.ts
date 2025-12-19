import { PlacesService } from "../../places.service";
import { CafeInfo } from "../../entities/cafe-info.entity";
import { Args, Resolver, Query, Info } from "@nestjs/graphql";
import { CafeInfoConnection, CafeInfoConnectionType, cafeInfoConnectionNodeLocation } from "../types/cafe-info-connection.type";
import { PaginationArgs, PaginationWithWhereArgs } from "../../../common/graphql";
import { Public } from "../../../util/decorators";
import { GraphQLResolveInfo } from "graphql";
import { getPrismaSelectFromInfo } from "../../../util/graphql";

@Resolver(() => CafeInfo)
export class PlacesResolver {
    constructor(private readonly placesService: PlacesService) {}

    @Public()
    @Query(() => CafeInfoConnection, { name: 'findPaginatedCafeInfos' })
    async findPaginatedCafeInfos(
      @Args() paginationArgs: PaginationWithWhereArgs,
      @Info() info: GraphQLResolveInfo,
    ): Promise<CafeInfoConnectionType> {
      const prismaSelect = getPrismaSelectFromInfo(info, 'CafeInfo', { id: true }, cafeInfoConnectionNodeLocation);
      const where = paginationArgs.where;
      return this.placesService.findPaginatedCafeInfos(paginationArgs, prismaSelect, where);
    }
}