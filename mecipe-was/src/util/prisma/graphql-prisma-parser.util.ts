import { GraphQLResolveInfo } from 'graphql';
import { FieldsByTypeName, parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import { Prisma } from 'prisma/basic'; // Prisma Client의 타입 정의 임포트
import { PrismaModelSelect } from './generated/prisma-model-select-type';
import { NodeLocation } from 'src/common/graphql';

function getFieldsByTypeName<TModelName extends Prisma.ModelName>(selectedFields: { [key: string]: ResolveTree }, defaultSelect: Partial<PrismaModelSelect<TModelName>> = { id: true } as any): PrismaModelSelect<TModelName> {

  // 타입 안전성을 위해 any로 시작하고, 최종 반환 시 타입 단언
  const prismaSelect: Partial<PrismaModelSelect<TModelName>> = {
    ...defaultSelect, // 기본적으로 ID 같은 필수 필드는 항상 포함
  };

  for (const fieldName in selectedFields) {
    // '__typename' 같은 내부 필드는 건너뜁니다.
    if (fieldName.startsWith('__')) {
      continue;
    }

    const field = selectedFields[fieldName];

    // 타입 안전성을 위해 fieldName이 해당 모델의 select에 포함되는지 확인
    // TypeScript 런타임에서는 체크하지 않지만, 컴파일 타임에 타입 체크됨
    if (field.fieldsByTypeName && Object.keys(field.fieldsByTypeName).length > 0) {
      // Nested Relation 필드인 경우 (RegionCategory, CafeVirtualLinks 등)
      // 해당 관계 필드의 SELECT 객체를 재귀적으로 생성합니다.
      // 여기서는 1:1, 1:N 관계를 가정하며, 필드 이름과 TypeName이 같다고 가정합니다.
      // 예를 들어, `CafeInfo` 모델의 `RegionCategory` 필드의 TypeName도 'RegionCategory'일 경우
      const relationModelName = fieldName as Prisma.ModelName; // 관계 필드 이름이 모델 이름과 같다고 가정

      // 재귀 호출로 nested select 생성
      const nestedSelect = getFieldsByTypeName(field.fieldsByTypeName[relationModelName]);

      // Prisma의 select 내부에 relation은 { select: ... } 형태로 지정
      // 타입 단언이 필요하지만, 구조적으로는 올바름
      prismaSelect[fieldName] = {
        select: nestedSelect
      } as any;

      // 참고: include 대신 select를 사용하는 이유
      // - select와 include는 동시에 사용할 수 없음
      // - select를 통해 필요한 필드만 가져오므로 더 효율적
      // - Prisma Client는 `select` 안에 nested `select`를 허용

    } else {
      // 일반 스칼라 필드인 경우
      // Prisma Select 타입에서는 boolean 또는 true만 허용
      prismaSelect[fieldName] = true;
    }
  }

  // 타입 안전성을 위해 최종 결과를 PrismaModelSelect 타입으로 캐스팅
  // 실제 런타임에서는 이미 올바른 구조를 가지고 있음
  return prismaSelect as PrismaModelSelect<TModelName>;
}

/**
 * GraphQL ResolveInfo 객체로부터 Prisma select 객체를 동적으로 생성.
 *
 * @param info GraphQLResolveInfo 객체
 * @param typeName Prisma 모델의 GraphQL ObjectType 이름 (예: 'CafeInfo', 'RegionCategory')
 * @param defaultSelect 모든 쿼리 시 기본적으로 포함되어야 하는 필드 (예: id)
 * @returns Prisma의 select 객체 (해당 모델의 Select 타입으로 타입 안전하게 반환)
 * 
 * @example
 * ```typescript
 * const select = getPrismaSelectFromInfo(info, 'CafeInfo');
 * // select의 타입은 자동으로 Prisma.CafeInfoSelect로 추론됨
 * 
 * const result = await prisma.cafeInfo.findMany({
 *   select,
 *   where: { ... }
 * });
 * ```
 */
export function getPrismaSelectFromInfo<TModelName extends Prisma.ModelName>(
  info: GraphQLResolveInfo,
  typeName: TModelName,
  defaultSelect: Partial<PrismaModelSelect<TModelName>> = { id: true } as any,
  fieldLocation: NodeLocation = null
): PrismaModelSelect<TModelName> {

  // parseResolveInfo는 ResolveTree 또는 FieldsByTypeName을 반환할 수 있음
  const parsedInfo = parseResolveInfo(info, { keepRoot: false, deep: true });
  
  // parsedInfo가 undefined이거나 null인 경우
  if (!parsedInfo) {
    // 파싱 실패 또는 info 객체에 필드 정보가 없는 경우 기본 select 반환
    return defaultSelect as any as PrismaModelSelect<TModelName>;
  }

  // parsedInfo가 FieldsByTypeName 형태일 수도 있음
  let targetFieldsByTypeName: FieldsByTypeName;
  if ('fieldsByTypeName' in parsedInfo) {
    // ResolveTree 형태
    targetFieldsByTypeName = (parsedInfo as ResolveTree).fieldsByTypeName;
  } else {
    // FieldsByTypeName 형태 (keepRoot: false일 때)
    targetFieldsByTypeName = parsedInfo as FieldsByTypeName;
  }
  if (fieldLocation && fieldLocation.length > 0) {
    targetFieldsByTypeName = fieldLocation.reduce((acc, location) => acc?.[location.name]?.[location.property]?.fieldsByTypeName, targetFieldsByTypeName) as FieldsByTypeName;
  }

  const selectedFields = targetFieldsByTypeName[typeName];
  if (!selectedFields) {
    return defaultSelect as any as PrismaModelSelect<TModelName>;
  }

  return getFieldsByTypeName<TModelName>(selectedFields, defaultSelect);
}
