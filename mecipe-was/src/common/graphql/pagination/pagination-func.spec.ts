import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/global/prisma.service';
import { TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { ICafeInfo } from 'src/places/entities/cafe-info.entity';
import { findPaginationBasedCursor } from './pagination-func';
import { GovermentType } from 'prisma/basic';

// prisma 모킹 테스트
// 그러나, 입력값과 상관없이 결과값이 정해지므로, 테스트 의미가 없음
describe('Cats (e2e)', () => {
    let mockPrisma: DeepMockProxy<PrismaService>;
    let mockCafeInfos: ICafeInfo[];


    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(PrismaService)
            .useValue(mockDeep<PrismaService>())
            .compile();

        mockPrisma = moduleFixture.get(PrismaService);

        mockCafeInfos = [
            { id: 1, name: 'A', createdAt: new Date(), isDisable: false, code: '1234567890', regionCategoryId: 1, address: '1234567890', directions: '1234567890', businessNumber: '1234567890', ceoName: '1234567890', RegionCategory: { id: 1, name: 'A', createdAt: new Date(), isDisable: false, govermentType: GovermentType.CITY, CafeInfos: [] } },
            { id: 2, name: 'B', createdAt: new Date(), isDisable: true, code: '1234567890', regionCategoryId: 1, address: '1234567890', directions: '1234567890', businessNumber: '1234567890', ceoName: '1234567890', RegionCategory: { id: 1, name: 'A', createdAt: new Date(), isDisable: false, govermentType: GovermentType.CITY, CafeInfos: [] } },
        ];
    })

    it('Creates a new cat', async () => {
        mockPrisma.cafeInfo.findMany.mockResolvedValueOnce(mockCafeInfos);
        mockPrisma.cafeInfo.count.mockResolvedValueOnce(mockCafeInfos.length);
        const result = await findPaginationBasedCursor(
            mockPrisma.cafeInfo,
            {
                page: 1,
                limit: 10,
            },
            "id",
            {
                id: true,
                name: true,
            },
            {
                isDisable: false,
            }
        );

        console.log(result);
        expect(result).toBeDefined();
    });
})