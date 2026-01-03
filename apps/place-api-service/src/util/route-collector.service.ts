import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { IS_PUBLIC_KEY } from '@virtualcafe/common';

/**
 * Route Collector Service
 * @Public() 데코레이터가 적용된 경로를 자동으로 수집
 */
@Injectable()
export class RouteCollectorService implements OnModuleInit {
  private publicPaths: Set<string> = new Set();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.collectPublicPaths();
  }

  /**
   * @Public() 데코레이터가 적용된 모든 경로 수집
   */
  private collectPublicPaths() {
    const controllers = this.discoveryService
      .getControllers()
      .filter((wrapper: InstanceWrapper) => wrapper.isDependencyTreeStatic())
      .map((wrapper: InstanceWrapper) => wrapper.instance)
      .filter(Boolean);

    controllers.forEach((controller) => {
      const prototype = Object.getPrototypeOf(controller);
      const controllerMetadata = this.getControllerMetadata(controller);

      // 컨트롤러의 모든 메서드 순회
      Object.getOwnPropertyNames(prototype).forEach((methodName) => {
        if (methodName === 'constructor') return;

        const method = prototype[methodName];
        const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, method);

        if (isPublic) {
          // 경로 구성
          const routePath = this.getRoutePath(controller, methodName, controllerMetadata);
          this.publicPaths.add(routePath);
        }
      });
    });

    console.log('📋 Collected public paths:', Array.from(this.publicPaths));
  }

  /**
   * 컨트롤러 메타데이터 가져오기
   */
  private getControllerMetadata(controller: any): string {
    const controllerClass = controller.constructor;
    const controllerPath = Reflect.getMetadata('path', controllerClass);
    return controllerPath || '';
  }

  /**
   * 라우트 경로 구성
   */
  private getRoutePath(
    controller: any,
    methodName: string,
    controllerPath: string,
  ): string {
    const method = Object.getPrototypeOf(controller)[methodName];
    const routeMetadata = Reflect.getMetadata('path', method);
    const methodPath = routeMetadata || '';

    // 컨트롤러 경로 + 메서드 경로
    const fullPath = controllerPath
      ? `${controllerPath}${methodPath}`
      : methodPath;

    return fullPath || '/';
  }

  /**
   * 수집된 public paths 반환
   */
  getPublicPaths(): string[] {
    return Array.from(this.publicPaths);
  }
}




