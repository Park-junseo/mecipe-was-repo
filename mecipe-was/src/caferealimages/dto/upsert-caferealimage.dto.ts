import { CreateUnCheckedCaferealimageDto } from "./create-caferealimage.dto";
import { UpdateCaferealimageWithIdDto } from "./update-caferealimage.dto";

export type UpsertCafeRealImageListDto = {create:CreateUnCheckedCaferealimageDto[],update:UpdateCaferealimageWithIdDto[]};