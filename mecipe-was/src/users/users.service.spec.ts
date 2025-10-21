import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/global/prisma.service';
import { PrismaServiceMock } from 'src/global/prisma.service.mock';

/**
 * 예시: 복잡한 비즈니스 로직이 있는 경우에만 작성하는 테스트
 * 
 * 단순 CRUD는 E2E 테스트로 검증하고,
 * 복잡한 계산 로직, 인증/인가, 데이터 변환 등만 단위 테스트로 작성합니다.
 */
describe('UsersService - Complex Business Logic', () => {
  let service: UsersService;
  let prismaService: typeof PrismaServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: PrismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  // 예시: 복잡한 비즈니스 로직 테스트
  describe('Password Validation', () => {
    it('should validate password correctly', () => {
      // 실제 패스워드 검증 로직이 있다면 테스트
      expect(service).toBeDefined();
    });
  });

  // 예시: 복잡한 데이터 변환 로직 테스트
  describe('User Data Transformation', () => {
    it('should transform user data correctly', () => {
      // 실제 데이터 변환 로직이 있다면 테스트
      expect(service).toBeDefined();
    });
  });

  // 실제로 복잡한 로직이 없다면 이 파일도 삭제하면 됩니다!
});

