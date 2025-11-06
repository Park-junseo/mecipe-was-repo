// prisma/factories/cafeInfo.factory.ts (DTO 기반으로 수정)
import { faker } from '@faker-js/faker';
import { CreateCafeInfoDto } from '../../src/places/dto/create-place.dto'; // ✨ 서비스 DTO 임포트

export function buildCafeInfoDto(
  params?: Partial<CreateCafeInfoDto>
): CreateCafeInfoDto {
  const name = params?.name || (faker.datatype.boolean()? 'Cafe ': '') + faker.company.name() + " " + faker.location.state();
  const code = params?.code || name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()+"-"+faker.string.alphanumeric(4);
  return {
    name: name,
    code: code,
    address: params?.address || faker.location.streetAddress(),
    businessNumber: params?.businessNumber || faker.finance.routingNumber(),
    ceoName: params?.ceoName || faker.person.fullName(),
    directions: params?.directions || faker.lorem.sentence(),
    isDisable: params?.isDisable || faker.datatype.boolean(),
    ...params,
  };
}