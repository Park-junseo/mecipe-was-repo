import { Test, TestingModule } from '@nestjs/testing';
import { CafeInfoController } from 'src/cafe-info/cafe-info.controller';
import { CafeInfoService } from 'src/cafe-info/cafe-info.service';
import { ElasticsearchService } from 'src/elasticsearch/elasticsearch.service';
import { createMockElasticsearchService } from '../mocks/elasticsearch.service.mock';
import { ValidationPipe, ArgumentMetadata } from '@nestjs/common';
import { CafeInfo } from 'src/cafe-info/entity/cafe-info.entity';

export type MockCafeInfoService = ReturnType<typeof createMockCafeInfoService>;
export const createMockCafeInfoService = () => {
  return {
    indexCafeInfo: jest.fn(),
    deleteCafeInfo: jest.fn(),
  };
};

// ValidationPipe 인스턴스 생성 (테스트에서 사용)
// 컨트롤러에 적용된 옵션과 동일하게 설정
// 주의: forbidNonWhitelisted를 false로 설정하여 Kafka 메타데이터 필드를 허용
// (실제 프로덕션에서는 Kafka 메타데이터가 @Payload()에 포함되지 않지만,
//  테스트에서는 rawPayload에 포함되어 있으므로 false로 설정)
export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false, // Kafka 메타데이터 필드를 허용하기 위해 false
  transform: true,
});

/**
 * ValidationPipe를 사용하여 rawPayload를 CafeInfo로 변환하는 헬퍼 함수
 *
 * - whitelist: false로 설정하여 ValidationPipe.transform()이 모든 필드를 유지하도록 함
 * - transform: true로 설정하여 @Transform 데코레이터가 적용되도록 함
 * - 이렇게 하면 ValidationPipe.transform()이 실제로 작동하며, @Transform 데코레이터도 적용됨
 */
export async function transformPayloadWithValidationPipe(
  rawPayload: unknown,
): Promise<CafeInfo> {
  const metadata: ArgumentMetadata = {
    type: 'body', // @Payload()는 body 타입으로 간주
    metatype: CafeInfo,
    data: undefined,
  };

  // whitelist: false로 설정하여 class-validator 데코레이터가 없어도 모든 필드를 유지
  // transform: true로 설정하여 @Transform 데코레이터가 적용되도록 함
  const tempPipe = new ValidationPipe({
    whitelist: false, // class-validator 데코레이터가 없으므로 false로 설정
    forbidNonWhitelisted: false,
    transform: true, // @Transform 데코레이터를 적용하기 위해 true
  });

  // ValidationPipe.transform()을 직접 호출하여 실제로 파이프가 작동하는지 확인
  // 이렇게 하면 ValidationPipe의 transform 옵션이 적용되어 @Transform 데코레이터가 실행됨
  return (await tempPipe.transform(rawPayload, metadata)) as CafeInfo;
}

/**
 * CafeInfo 테스트용 모듈 생성
 * ElasticsearchService와 CafeInfoService를 mock으로 제공하여 실제 Elasticsearch 연결 없이 테스트 가능
 */
export async function createCafeInfoTestModule() {
  const elasticsearchMock = createMockElasticsearchService();

  const mockCafeInfoService = createMockCafeInfoService();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [CafeInfoController],
    providers: [
      {
        provide: CafeInfoService,
        useValue: mockCafeInfoService,
      },
      {
        provide: ElasticsearchService,
        useValue: elasticsearchMock.service,
      },
    ],
  }).compile();

  const controller = module.get<CafeInfoController>(CafeInfoController);
  const service = module.get<MockCafeInfoService>(CafeInfoService);

  return {
    module,
    controller,
    service,
    elasticsearchMock,
  };
}
