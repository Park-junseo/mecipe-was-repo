import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExamplesModule } from './examples/examples.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { HttpLoggerMiddleware } from './util/middleware/http-logger.middleware';
import { HttpBodyLoggerInterceptor } from './util/interceptor/http-body-logger.interceptor';
import { JwtAuthGuard } from './auth/jwt.guard';
import { ApiKeyGuard } from './auth/api-key.guard';
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
import { MetaVeiwersModule } from './meta-veiwers/meta-veiwers.module';
import { MetaViewerInfosModule } from './meta-viewer-infos/meta-viewer-infos.module';
import { ProductsModule } from './products/products.module';
import { ProductcategoriesModule } from './productcategories/productcategories.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'media'),
      serveRoot: '/media',
      serveStaticOptions: {
        fallthrough: false,
      },
    }),
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
    MetaVeiwersModule,
    MetaViewerInfosModule,
    ProductsModule,
    ProductcategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpBodyLoggerInterceptor,
    },
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('/');
  }
}