
import { PrismaService } from 'src/global/prisma.service'
import { beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'

// 2
beforeEach(() => {
  mockReset(prismaMock)
})

// 3
const prismaMock = mockDeep<PrismaService>()
export default prismaMock