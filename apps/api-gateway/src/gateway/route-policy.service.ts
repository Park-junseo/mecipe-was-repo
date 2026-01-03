import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync, existsSync, watchFile } from 'fs';
import { join } from 'path';
import { RoutePoilcy } from '@virtualcafe/common';

/**
 * Route Policy Service
 * route-policy.json 파일을 읽어서 라우팅 정책을 관리
 */
@Injectable()
export class RoutePolicyService implements OnModuleInit {
  private readonly logger = new Logger(RoutePolicyService.name);
  private policyMap: Map<string, RoutePoilcy> = new Map();
  // 동적 라우팅 파라미터를 포함한 정책 (정규식 매칭용)
  private dynamicPolicyMap: Array<{
    pattern: RegExp;
    policy: RoutePoilcy;
    originalKey: string;
  }> = [];
  private policyFilePath: string;

  constructor() {
    // 정책 파일 경로 설정 (환경 변수 또는 기본값)
    // webpack으로 번들링되면 __dirname이 dist/apps/api-gateway를 가리킴
    // 빌드 후: dist/apps/api-gateway/config/route-policy.json
    // project.json의 assets 설정에 따라 config/route-policy.json으로 복사됨
    this.policyFilePath =
      process.env.ROUTE_POLICY_FILE_PATH ||
      join(__dirname, 'config', 'route-policy.json');
  }

  /**
   * 모듈 초기화 시 정책 파일 로드
   */
  onModuleInit() {
    this.loadPolicy();
    this.watchPolicyFile();
  }

  /**
   * 정책 파일 로드
   */
  private loadPolicy(): void {
    try {
      if (!existsSync(this.policyFilePath)) {
        this.logger.warn(
          `Route policy file not found: ${this.policyFilePath}. Using empty policy.`,
        );
        this.policyMap.clear();
        return;
      }

      const fileContent = readFileSync(this.policyFilePath, 'utf-8');
      const policyObject = JSON.parse(fileContent) as Record<string, RoutePoilcy>;

      this.policyMap.clear();
      this.dynamicPolicyMap = [];

      Object.entries(policyObject).forEach(([key, value]) => {
        // 키에서 메서드와 경로 분리
        const [method, path] = key.split(' ', 2);
        const normalizedPath = this.normalizePath(path);
        const normalizedKey = `${method.toUpperCase()} ${normalizedPath}`;
        
        // 정규화된 키로 저장
        this.policyMap.set(normalizedKey, value);

        // 동적 라우팅 파라미터가 있는 경우 정규식 패턴 생성
        if (normalizedPath.includes(':')) {
          // :id, :userId 등을 정규식으로 변환
          // 파라미터 이름에 'id'가 포함된 경우 숫자만 매칭 (\d+)
          // 그 외의 경우 모든 문자 매칭 ([^/]+)
          const regexPattern = normalizedPath
            .replace(/:([^/]+)/g, (match, paramName) => {
              // 파라미터 이름에 'id'가 포함되어 있으면 (대소문자 구분 없이) 숫자만 매칭
              if (/id/i.test(paramName)) {
                return '(\\d+)';
              }
              // 그 외의 경우 모든 문자 매칭
              return '([^/]+)';
            })
            .replace(/\//g, '\\/'); // / -> \/
          
          const regex = new RegExp(`^${regexPattern}$`);
          
          this.dynamicPolicyMap.push({
            pattern: regex,
            policy: value,
            originalKey: normalizedKey,
          });
        }
      });

      this.logger.log(
        `✅ Route policy loaded: ${this.policyMap.size} routes from ${this.policyFilePath}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to load route policy: ${error.message}`,
        error.stack,
      );
      this.policyMap.clear();
    }
  }

  /**
   * 정책 파일 변경 감지 (개발 환경)
   */
  private watchPolicyFile(): void {
    if (process.env.NODE_ENV === 'production') {
      return; // 프로덕션에서는 파일 감시 비활성화
    }

    if (!existsSync(this.policyFilePath)) {
      return;
    }

    watchFile(this.policyFilePath, { interval: 1000 }, () => {
      this.logger.log('🔄 Route policy file changed, reloading...');
      this.loadPolicy();
    });

    this.logger.log(`👀 Watching route policy file: ${this.policyFilePath}`);
  }

  /**
   * 특정 라우트의 정책 조회
   * @param method - HTTP 메서드 (GET, POST, etc.)
   * @param path - 라우트 경로
   * @returns 정책 객체 또는 null
   */
  getPolicy(method: string, path: string): RoutePoilcy | null {
    const normalizedPath = this.normalizePath(path);
    const key = `${method.toUpperCase()} ${normalizedPath}`;
    
    // 1. 정확한 매칭 시도
    const exactMatch = this.policyMap.get(key);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. 동적 라우팅 파라미터 매칭 시도
    const fullPath = normalizedPath;
    for (const { pattern, policy, originalKey } of this.dynamicPolicyMap) {
      // 메서드가 일치하는지 확인
      const [policyMethod] = originalKey.split(' ', 1);
      if (policyMethod.toUpperCase() !== method.toUpperCase()) {
        continue;
      }
      
      // 경로 패턴 매칭
      if (pattern.test(fullPath)) {
        return policy;
      }
    }

    return null;
  }

  /**
   * 라우트가 Public인지 확인
   * @param method - HTTP 메서드
   * @param path - 라우트 경로
   * @returns Public 여부
   */
  isPublic(method: string, path: string): boolean {
    const policy = this.getPolicy(method, path);
    return policy?.type === 'public' || false;
  }

  /**
   * 라우트에 필요한 역할 확인
   * @param method - HTTP 메서드
   * @param path - 라우트 경로
   * @returns 필요한 역할 배열 또는 null
   */
  getRequiredRoles(method: string, path: string): string[] | null {
    const policy = this.getPolicy(method, path);
    if (policy?.type === 'role') {
      return policy.roles;
    }
    return null;
  }

  /**
   * 사용자 역할이 라우트 접근 권한이 있는지 확인
   * @param method - HTTP 메서드
   * @param path - 라우트 경로
   * @param userRole - 사용자 역할
   * @returns 접근 권한 여부
   */
  hasAccess(method: string, path: string, userRole?: string): boolean {
    const policy = this.getPolicy(method, path);

    // 정책이 없으면 기본적으로 인증 필요 (보안을 위해)
    if (!policy) {
      return false;
    }

    // Public 라우트는 모든 사용자 접근 가능
    if (policy.type === 'public') {
      return true;
    }

    // Role 기반 정책
    if (policy.type === 'role') {
      if (!userRole) {
        return false; // 역할이 없으면 접근 불가
      }
      return policy.roles.some(
        (role) =>
          userRole === role ||
          userRole.toUpperCase() === role.toUpperCase(),
      );
    }

    return false;
  }

  /**
   * 모든 정책 조회 (디버깅용)
   */
  getAllPolicies(): Map<string, RoutePoilcy> {
    return new Map(this.policyMap);
  }

  /**
   * 경로 정규화 (슬래시 정리)
   */
  private normalizePath(path: string): string {
    return '/' + path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }
}

