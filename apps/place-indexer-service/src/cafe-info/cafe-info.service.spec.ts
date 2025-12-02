import { createCafeInfoTestModule } from 'src/test-utils';
import { CafeInfo, ICafeInfo, IRegionCategory } from './entity';
import { CAFEINFO_WITH_REGIONCATEGORY_TOPIC } from 'src/kafka/topics';
import { extractEntityFields } from 'src/elasticsearch/libs';
import { plainToInstance } from 'class-transformer';

type KafkaCafeInfo = Omit<ICafeInfo, 'createdAt' | 'RegionCategory'> & {
  createdAt: number;
};
type KafkaRegionCategory = Omit<IRegionCategory, 'createdAt'> & {
  createdAt: number;
};
type KafkaCafeInfoWithRegionCategory = KafkaCafeInfo & {
  RegionCategory: KafkaRegionCategory;
} & {
  offset: string;
  timestamp: string;
  topic: string;
  partition: number;
};

describe('CafeInfoService', () => {
  //   let service: MockCafeInfoService;
  let elasticsearchMock: Awaited<
    ReturnType<typeof createCafeInfoTestModule>
  >['elasticsearchMock'];

  beforeEach(async () => {
    const testModule = await createCafeInfoTestModule();
    // service = testModule.service;
    elasticsearchMock = testModule.elasticsearchMock;

    // Reset mocks
    jest.clearAllMocks();
    elasticsearchMock.reset();
  });

  describe('indexCafeInfo', () => {
    const mockKafkaCafeInfoTopicMessage: KafkaCafeInfoWithRegionCategory = {
      createdAt: 1763377316093,
      isDisable: false,
      name: 'Cafe Barrows, King and Corwin Washington2',
      code: 'cafe-barrows-king-and-corwin-washington-RbvP',
      regionCategoryId: 13,
      address: '1084 VonRueden Plaza',
      directions: 'Dignissimos sublime tamquam paens.',
      businessNumber: '959485747',
      ceoName: 'Marcos Wunsch',
      RegionCategory: {
        id: 13,
        createdAt: 1763377305710,
        name: 'Pennsylvania',
        isDisable: true,
        govermentType: 'TOWNSHIP',
      },
      offset: '0',
      timestamp: new Date().toISOString(),
      topic: CAFEINFO_WITH_REGIONCATEGORY_TOPIC,
      partition: 0,
    };

    it('should document be same as expected result', () => {
      // plainToInstance로 변환하여 @Transform 데코레이터가 작동하도록 함
      const tempResult: ICafeInfo = plainToInstance(
        CafeInfo,
        mockKafkaCafeInfoTopicMessage,
        {
          enableImplicitConversion: true,
        },
      );

      // extractEntityFields로 엔티티에 정의된 필드만 추출
      const cleanDocument = extractEntityFields(tempResult);

      // expectedResult도 동일하게 변환하여 비교
      // 메타데이터 필드를 제거한 객체로 변환
      const { offset, partition, timestamp, topic, ...cleanPayload } =
        mockKafkaCafeInfoTopicMessage;
      void offset;
      void partition;
      void timestamp;
      void topic;
      const expectedResult = {
        ...cleanPayload,
        createdAt: new Date(cleanPayload.createdAt),
        RegionCategory: {
          ...cleanPayload.RegionCategory,
          createdAt: new Date(cleanPayload.RegionCategory.createdAt),
        },
      };

      expect(cleanDocument).toEqual(expectedResult);
    });
  });
});
