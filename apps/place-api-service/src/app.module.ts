import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExamplesModule } from './examples/examples.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { ApiKeyGuard } from './auth/api-key.guard';
import {
  CommonAuthModule,
  UserHeaderMiddleware,
  AuthorizationGuard,
  HttpLoggerMiddleware,
  HttpBodyLoggerInterceptor,
} from '@virtualcafe/common';
import { UsersModule } from './users/users.module';
import { GlobalModule } from './global/global.module';
import { AuthModule } from './auth/auth.module';
import { PlacesModule } from './places/places.module';
import { RegioncategoriesModule } from './regioncategories/regioncategories.module';
import { ImageuploadModule } from './imageupload/imageupload.module';
import { CafethumbnailimagesModule } from './cafethumbnailimages/cafethumbnailimages.module';
import { CafevirtualimagesModule } from './cafevirtualimages/cafevirtualimages.module';
import { CaferealimagesModule } from './caferealimages/caferealimages.module';
import { CafevirtuallinksModule } from './cafevirtuallinks/cafevirtuallinks.module';
import { RawimageuploadModule } from './rawimageupload/rawimageupload.module';
import { CouponsModule } from './coupons/coupons.module';
import { BoardsModule } from './boards/boards.module';
import { ProductsModule } from './products/products.module';
import { MetaViewerInfosModule } from './meta-viewer-infos/meta-viewer-infos.module';
import { ProductcategoriesModule } from './productcategories/productcategories.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JSONScalar } from './common/graphql/scalars/json.scalar';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '.', 'media'),
      serveRoot: '/media',
      serveStaticOptions: {
        fallthrough: false,
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(__dirname, '.', 'common', 'graphql', 'schema.gql'),
    }),
    CommonAuthModule, // Gateway 방식: 공통 모듈 사용
    GlobalModule,
    ExamplesModule,
    UsersModule,
    AuthModule,
    PlacesModule,
    RegioncategoriesModule,
    ImageuploadModule,
    CafethumbnailimagesModule,
    CafevirtualimagesModule,
    CaferealimagesModule,
    CafevirtuallinksModule,
    RawimageuploadModule,
    CouponsModule,
    BoardsModule,
    ProductsModule,
    MetaViewerInfosModule,
    ProductcategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard, // Gateway 방식: 권한 체크만
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpBodyLoggerInterceptor,
    },
    JSONScalar, // GraphQL JSON 스칼라 등록
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('/');
    // Gateway가 전달한 헤더에서 user 정보 추출
    consumer.apply(UserHeaderMiddleware).forRoutes('*');
  }
}
