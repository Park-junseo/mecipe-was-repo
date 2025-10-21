import { Prisma } from "prisma/basic";
import { PrimitiveOnly } from "src/util/types";

export type CreateCafevirtuallinkDto = PrimitiveOnly<Prisma.CafeVirtualLinkCreateInput>;
export type CreateCafeVirtaulLinkThumbnailImageDto = PrimitiveOnly<Prisma.CafeVirtualLinkThumbnailImageCreateInput>;
export type CreateCafeVirtaulLinkWithImageDto = {
    link: CreateCafevirtuallinkDto,
    thumbnailImage: CreateCafeVirtaulLinkThumbnailImageDto
}

export type CreateCafeVirtaulLinkWithImageListDto = {
    create: CreateCafeVirtaulLinkWithImageDto[];
}

export type CafeVirtualLinkResult = Prisma.CafeVirtualLinkGetPayload<{
    include: {
        CafeVirtualLinkThumbnailImage: true
    }
}>;