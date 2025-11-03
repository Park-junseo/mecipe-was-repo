/**
 * 실제 NestJS GraphQL 서버를 사용하여 GraphQLResolveInfo를 얻는 통합 테스트 헬퍼
 * 
 * 이 파일은 실제 NestJS 애플리케이션에서 GraphQL 쿼리를 실행하여
 * 실제 GraphQLResolveInfo를 얻는 방법을 보여줍니다.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppModule } from 'src/app.module';
import { GraphQLResolveInfo } from 'graphql';

/**
 * 실제 NestJS 애플리케이션을 생성하고 GraphQL 쿼리를 실행하여
 * GraphQLResolveInfo를 얻습니다.
 * 
 * @example
 * ```typescript
 * const app = await createTestApp();
 * const info = await getGraphQLResolveInfoFromQuery(
 *   app,
 *   `query { findPaginatedCafeInfos(limit: 10) { edges { node { id name } } } }`,
 *   'findPaginatedCafeInfos'
 * );
 * ```
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

/**
 * 실제 GraphQL resolver를 호출하여 GraphQLResolveInfo를 얻습니다.
 * 
 * 주의: 이 방법은 실제 resolver 함수를 직접 호출하여 info를 얻습니다.
 */
export async function getGraphQLResolveInfoFromResolver(
  resolver: any,
  methodName: string,
  args: any[],
): Promise<GraphQLResolveInfo> {
  // Resolver의 메서드를 래핑하여 info를 캡처
  let capturedInfo: GraphQLResolveInfo | null = null;

  const originalMethod = resolver[methodName].bind(resolver);
  resolver[methodName] = async (...methodArgs: any[]) => {
    // @Info() 데코레이터로 주입된 info를 찾음
    const infoArg = methodArgs.find(arg => arg && typeof arg === 'object' && 'fieldName' in arg);
    if (infoArg) {
      capturedInfo = infoArg;
    }
    return originalMethod(...methodArgs);
  };

  try {
    await resolver[methodName](...args);
    if (!capturedInfo) {
      throw new Error('GraphQLResolveInfo not captured from resolver');
    }
    return capturedInfo;
  } finally {
    // 원래 메서드 복원
    resolver[methodName] = originalMethod;
  }
}

/**
 * 더 나은 방법: 테스트용 mock resolver를 만들어서 실제 GraphQL execution을 시뮬레이션
 * 
 * 이 방법은 실제 GraphQL 서버를 실행하고 쿼리를 보내는 것보다 간단하지만,
 * 실제 GraphQLResolveInfo 구조를 얻을 수 있습니다.
 */
export function createMockGraphQLResolveInfo(
  query: string,
  fieldName: string,
): GraphQLResolveInfo {
  // 이 방법은 완전하지 않을 수 있으므로, 
  // 실제로는 integration test에서 실제 resolver를 사용하는 것을 권장합니다.
  throw new Error(
    'This method is not fully implemented. ' +
    'Please use actual NestJS GraphQL integration tests to get real GraphQLResolveInfo. ' +
    'See: https://docs.nestjs.com/graphql/testing'
  );
}

