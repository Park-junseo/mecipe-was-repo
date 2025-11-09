
import { PrismaService } from 'src/global/prisma.service'
import { mockDeep, mockReset } from 'jest-mock-extended'

// 2
beforeEach(() => {
  mockReset(prismaMock)
})

// 3
const prismaMock = mockDeep<PrismaService>()
export default prismaMock