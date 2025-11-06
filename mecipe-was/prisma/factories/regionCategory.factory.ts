import { faker } from '@faker-js/faker';
import { GovermentType } from 'prisma/basic';
import { CreateUncheckedRegioncategoryDto } from "src/regioncategories/dto/create-regioncategory.dto";

export function buildRegionCategoryDto(
    params?: Partial<CreateUncheckedRegioncategoryDto>,
    parentGovermentType?: GovermentType
): CreateUncheckedRegioncategoryDto {
    let govermentTypeArray = Object.values(GovermentType);
    if(parentGovermentType) {
        const parentIndex = govermentTypeArray.indexOf(parentGovermentType);
        if(parentIndex !== -1 && parentIndex < govermentTypeArray.length - 1) {
            govermentTypeArray = govermentTypeArray.slice(parentIndex + 1);
        }
    }

    return {
        name: params?.name || faker.location.state(),
        isDisable: params?.isDisable || faker.datatype.boolean(),
        govermentType: params?.govermentType || faker.helpers.arrayElement(govermentTypeArray),
        ...params,
    };
}