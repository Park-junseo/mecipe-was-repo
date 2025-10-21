import { CreateUnCheckedCafethumbnailimageDto } from "./create-cafethumbnailimage.dto";
import { UpdateCafethumbnailimageWithIdDto } from "./update-cafethumbnailimage.dto";

export type UpsertCafethumbnailimageListDto = {create:CreateUnCheckedCafethumbnailimageDto[],update:UpdateCafethumbnailimageWithIdDto[]};