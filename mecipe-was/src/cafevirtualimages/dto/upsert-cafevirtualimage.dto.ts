import { CreateUnCheckedCafevirtualimageDto } from "./create-cafevirtualimage.dto";
import { UpdateCafevirtualimageWithIdDto } from "./update-cafevirtualimage.dto";

export type UpsertCafeVirtualImageListDto = {create:CreateUnCheckedCafevirtualimageDto[],update:UpdateCafevirtualimageWithIdDto[]};