// prisma/seed/seed.ts
import { RegioncategoriesService } from 'src/regioncategories/regioncategories.service'; // 다른 서비스
import { buildRegionCategoryDto } from 'prisma/factories/regionCategory.factory';
import { buildCafeInfoDto } from 'prisma/factories/cafeInfo.factory'; // ✨ DTO 팩토리
import { faker } from '@faker-js/faker';
import { CreateCafeInfoDto } from 'src/places/dto/create-place.dto';
import { GovermentType, RegionCategory } from 'prisma/basic';
import { PrismaService } from 'src/global/prisma.service';
import { SeedModuleAction } from '.';

let prisma: PrismaService;

async function createRegionCategories(regionCategoryService: RegioncategoriesService, govermentTypes: GovermentType[][], depth: number, count: number, parentId?: number): Promise<RegionCategory[]> {
  const createdRegionCategories: RegionCategory[] = [];
  const targetGovermentTypes = govermentTypes[depth];
  
  // 현재 depth의 카테고리 생성
  for (let i = 0; i < count; i++) {
    const regionData = buildRegionCategoryDto({
      govermentType: faker.helpers.arrayElement(targetGovermentTypes),
    });
    let region: RegionCategory | null = null;
    try {
      region = await regionCategoryService.createRegionCategory(regionData, parentId);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      continue;
    }

    createdRegionCategories.push(region);
  }

  // 마지막 depth면 현재 생성한 노드들만 반환
  if (depth === govermentTypes.length - 1) {
    return createdRegionCategories;
  }

  // 마지막 depth가 아니면, 자식들을 재귀적으로 생성하고 마지막 노드들만 수집
  const leafNodes: RegionCategory[] = [];
  for (const region of createdRegionCategories) {
    const children = await createRegionCategories(regionCategoryService, govermentTypes, depth + 1, count, region.id);
    leafNodes.push(...children);
  }
  
  return leafNodes;
}

export const resetCafeInfoBigData: SeedModuleAction = async (repository: { databaseUrl: string }|PrismaService) => {
  prisma = repository instanceof PrismaService ? repository : new PrismaService({
    datasources: {
      db: {
        url: repository.databaseUrl,
      },
    },
  });
  try {
    console.log('🗑️ Deleting existing data...');
    await prisma.cafeInfo.deleteMany();
    await prisma.closureRegionCategory.deleteMany();
    await prisma.regionCategory.deleteMany();
    console.log('✅ Existing data deleted.');
  } catch (error) {
    console.error('❌ Failed to delete existing data:', error);
    throw new Error('Failed to delete existing data');
  }

  // Prisma 연결 종료하여 프로세스가 정상 종료되도록 함
  // 단, PrismaService 인스턴스가 외부에서 전달된 경우 연결을 종료하지 않음
  if(!(repository instanceof PrismaService)) {
    await prisma.$disconnect();
  }
}

export const seedCafeInfoBigData: SeedModuleAction = async (repository: { databaseUrl: string }|PrismaService) => {
  console.log('✨ Start seeding with services...');

  prisma = repository instanceof PrismaService ? repository : new PrismaService({
    datasources: {
      db: {
        url: repository.databaseUrl,
      },
    },
  });

  // 서비스 인스턴스 가져오기 (DI 컨테이너로부터)
  const regionCategoryService = new RegioncategoriesService(prisma);

  // 1. 기존 데이터 삭제
  await resetCafeInfoBigData(prisma);

  // 2. RegionCategories (서비스를 통해 생성)
  console.log('📦 Seeding RegionCategories with service...');
  const regionCategoriesToCreate = 2;
  const regionLayer = [
    [
      GovermentType.SPECIAL_CITY,
      GovermentType.METROPOLITAN_CITY,
      GovermentType.SPECIAL_SELF_GOVERNING_CITY,
      GovermentType.PROVINCE,
      GovermentType.SPECIAL_SELF_GOVERNING_PROVINCE,
    ],
    [
      GovermentType.DISTRICT,
      GovermentType.CITY,
      GovermentType.COUNTY,
      GovermentType.TOWN,
    ],
    [
      GovermentType.TOWNSHIP,
      GovermentType.NEIGHBORHOOD,
      GovermentType.PLACENAME,
    ]
  ]
  const createdRegionCategories = await createRegionCategories(regionCategoryService, regionLayer, 0, regionCategoriesToCreate);
  console.log(`✅ ${createdRegionCategories.length} RegionCategories created.`);

  // 3. CafeInfos (서비스를 통해 생성)
  console.log('☕ Seeding CafeInfos with service...');
  const NUM_CAFES_TO_CREATE = parseInt(process.env.SEED_COUNT_CAFES || '100', 10); // 서비스로 개별 생성이라 적게 설정
  let createdCafesCount = 0;

  if (createdRegionCategories.length > 0) {
    for (let i = 0; i < NUM_CAFES_TO_CREATE; i++) {
      const randomRegion = faker.helpers.arrayElement(createdRegionCategories);
      const cafeData: CreateCafeInfoDto = buildCafeInfoDto();

      await prisma.cafeInfo.create({
        data: {
          ...cafeData,
          RegionCategory: {
            connect: {
              id: randomRegion.id,
            },
          },
        },
      });

      createdCafesCount++;
      if (createdCafesCount % 10 === 0) {
        process.stdout.write(`  -> Created ${createdCafesCount}/${NUM_CAFES_TO_CREATE} CafeInfos...\r`);
      }
    }
  }
  console.log(`\n✅ ${createdCafesCount} CafeInfos created.`);

  console.log('🌱 Seeding finished through services.');
  
  // Prisma 연결 종료하여 프로세스가 정상 종료되도록 함
  // 단, PrismaService 인스턴스가 외부에서 전달된 경우 연결을 종료하지 않음
  if(!(repository instanceof PrismaService)) {
    await prisma.$disconnect();
  }
}

if (require.main === module) {

  const args = process.argv.slice(2);

  const databaseUrl = args[0];
  if (!databaseUrl) {
    console.error('❌ Database URL is required');
    process.exit(1);
  }

  seedCafeInfoBigData({ databaseUrl }).catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma?.$disconnect();
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await prisma?.$disconnect();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await prisma?.$disconnect();
    process.exit(0);
  });
}
