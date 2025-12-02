import 'reflect-metadata';
import { KafkaContext } from '@nestjs/microservices';
import { CafeInfoController } from './cafe-info.controller';
import { CAFEINFO_WITH_REGIONCATEGORY_TOPIC } from 'src/kafka/topics';
import { ICafeInfo, IRegionCategory, CafeInfo } from './entity';
import { MockCafeInfoService, createCafeInfoTestModule } from 'src/test-utils';
import { TransformMessagePipe } from 'src/util/pipes/transform-message.pipe';

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

describe('CafeInfoController', () => {
  let controller: CafeInfoController;
  let service: MockCafeInfoService;
  let elasticsearchMock: Awaited<
    ReturnType<typeof createCafeInfoTestModule>
  >['elasticsearchMock'];

  beforeEach(async () => {
    const testModule = await createCafeInfoTestModule();
    controller = testModule.controller;
    service = testModule.service;
    elasticsearchMock = testModule.elasticsearchMock;

    // Reset mocks
    jest.clearAllMocks();
    elasticsearchMock.reset();
  });

  describe('handleCafeInfoIndexed', () => {
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

    const createMockKafkaContext = (key: string = 'test-doc-id') => {
      const mockMessage = {
        key: Buffer.from(key),
        value: Buffer.from(JSON.stringify(mockKafkaCafeInfoTopicMessage)),
        headers: {},
        partition: 0,
        offset: '0',
        timestamp: new Date().toISOString(),
        topic: CAFEINFO_WITH_REGIONCATEGORY_TOPIC,
      };

      return {
        getMessage: jest.fn().mockReturnValue(mockMessage),
        getTopic: jest.fn().mockReturnValue(CAFEINFO_WITH_REGIONCATEGORY_TOPIC),
        getPartition: jest.fn().mockReturnValue(0),
        getOffset: jest.fn().mockReturnValue('0'),
      } as unknown as KafkaContext;
    };

    it('should index cafe info when payload is provided', async () => {
      // Arrange - 실제 Kafka 메시지 형식 (rawPayload)
      const rawPayload = mockKafkaCafeInfoTopicMessage;
      const context = createMockKafkaContext('test-doc-id');
      const docId = 'test-doc-id';

      // TransformMessagePipe를 직접 사용하여 실제 파이프라인과 동일하게 테스트
      const transformPipe = new TransformMessagePipe(CafeInfo);
      const transformedPayload = transformPipe.transform(rawPayload);

      // Act - 변환된 payload를 전달
      await controller.handleCafeInfoIndexed(transformedPayload, context);

      // Assert - TransformMessagePipe가 작동하여 createdAt이 Date 객체로 변환되었는지 확인
      expect(service.indexCafeInfo).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const calledPayload = service.indexCafeInfo.mock.calls[0][0] as CafeInfo;
      expect(calledPayload).toBeDefined();
      expect(calledPayload.createdAt).toBeInstanceOf(Date);
      expect(calledPayload.createdAt.getTime()).toBe(1763377316093);
      expect(calledPayload.RegionCategory?.createdAt).toBeInstanceOf(Date);
      // extractEntityFields가 Kafka 메타데이터를 제거했는지 확인
      expect(calledPayload).not.toHaveProperty('offset');
      expect(calledPayload).not.toHaveProperty('timestamp');
      expect(calledPayload).not.toHaveProperty('topic');
      expect(calledPayload).not.toHaveProperty('partition');
      expect(service.indexCafeInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          name: rawPayload.name,
          createdAt: expect.any(Date) as Date,
        }),
        docId,
      );
      expect(service.deleteCafeInfo).not.toHaveBeenCalled();
    });

    it('should transform timestamp from number to Date using TransformMessagePipe', async () => {
      // Arrange - 실제 Kafka 메시지 형식 (createdAt이 숫자)
      const rawPayload = mockKafkaCafeInfoTopicMessage;
      const context = createMockKafkaContext('test-doc-id');

      // TransformMessagePipe를 직접 사용하여 실제 파이프라인과 동일하게 테스트
      const transformPipe = new TransformMessagePipe(CafeInfo);
      const transformedPayload = transformPipe.transform(rawPayload);

      // Assert - TransformMessagePipe가 작동하여 createdAt이 Date 객체로 변환되었는지 확인
      // TransformMessagePipe는 내부적으로 plainToInstance를 호출하므로
      // @Transform 데코레이터가 적용되어야 함
      expect(transformedPayload).not.toBeNull();
      if (transformedPayload) {
        expect(transformedPayload.createdAt).toBeInstanceOf(Date);
        expect(transformedPayload.createdAt.getTime()).toBe(1763377316093);

        // RegionCategory의 createdAt도 변환되었는지 확인
        if (transformedPayload.RegionCategory) {
          expect(transformedPayload.RegionCategory.createdAt).toBeInstanceOf(
            Date,
          );
          expect(transformedPayload.RegionCategory.createdAt.getTime()).toBe(
            1763377305710,
          );
        }

        // extractEntityFields가 Kafka 메타데이터를 제거했는지 확인
        expect(transformedPayload).not.toHaveProperty('offset');
        expect(transformedPayload).not.toHaveProperty('timestamp');
        expect(transformedPayload).not.toHaveProperty('topic');
        expect(transformedPayload).not.toHaveProperty('partition');
      }

      // Act - 변환된 payload를 전달
      await controller.handleCafeInfoIndexed(transformedPayload, context);

      // Assert - 서비스에 전달된 payload도 변환되었는지 확인
      expect(service.indexCafeInfo).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const calledPayload = service.indexCafeInfo.mock.calls[0][0] as CafeInfo;
      expect(calledPayload).toBeDefined();
      expect(calledPayload.createdAt).toBeInstanceOf(Date);
      expect(calledPayload.createdAt.getTime()).toBe(1763377316093);
    });

    it('should delete cafe info when payload is null', async () => {
      // Arrange
      const payload = null;
      const context = createMockKafkaContext('test-doc-id');
      const docId = 'test-doc-id';

      // Act
      await controller.handleCafeInfoIndexed(payload, context);

      // Assert
      expect(service.deleteCafeInfo).toHaveBeenCalledTimes(1);
      expect(service.deleteCafeInfo).toHaveBeenCalledWith(docId);
      expect(service.indexCafeInfo).not.toHaveBeenCalled();
    });

    it('should throw error when docId is missing', async () => {
      // Arrange
      const rawPayload = mockKafkaCafeInfoTopicMessage;
      const transformPipe = new TransformMessagePipe(CafeInfo);
      const payload = transformPipe.transform(rawPayload);
      const createMockKafkaContextWithoutKey = () => {
        const mockMessage = {
          key: null,
          value: Buffer.from(JSON.stringify(mockKafkaCafeInfoTopicMessage)),
          headers: {},
          partition: 0,
          offset: '0',
          timestamp: new Date().toISOString(),
          topic: CAFEINFO_WITH_REGIONCATEGORY_TOPIC,
        };

        return {
          getMessage: jest.fn().mockReturnValue(mockMessage),
          getTopic: jest
            .fn()
            .mockReturnValue(CAFEINFO_WITH_REGIONCATEGORY_TOPIC),
          getPartition: jest.fn().mockReturnValue(0),
          getOffset: jest.fn().mockReturnValue('0'),
        } as unknown as KafkaContext;
      };
      const context = createMockKafkaContextWithoutKey();

      // Act & Assert
      await expect(
        controller.handleCafeInfoIndexed(payload, context),
      ).rejects.toThrow('Kafka key is required');

      expect(service.indexCafeInfo).not.toHaveBeenCalled();
      expect(service.deleteCafeInfo).not.toHaveBeenCalled();
    });

    it('should extract docId from Kafka message key correctly', async () => {
      // Arrange
      const rawPayload = mockKafkaCafeInfoTopicMessage;
      const transformPipe = new TransformMessagePipe(CafeInfo);
      const payload = transformPipe.transform(rawPayload);
      const docId = 'custom-doc-id-123';
      const context = createMockKafkaContext(docId);

      // Act
      await controller.handleCafeInfoIndexed(payload, context);

      // Assert
      expect(service.indexCafeInfo).toHaveBeenCalledWith(payload, docId);
    });

    it('should handle empty string key as missing key', async () => {
      // Arrange
      const rawPayload = mockKafkaCafeInfoTopicMessage;
      const transformPipe = new TransformMessagePipe(CafeInfo);
      const payload = transformPipe.transform(rawPayload);
      const context = createMockKafkaContext('');

      // Act & Assert
      await expect(
        controller.handleCafeInfoIndexed(payload, context),
      ).rejects.toThrow('Kafka key is required');
    });
  });
});
