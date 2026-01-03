/**
 * Redis Adapter를 사용하는 WebSocket Gateway 예시
 * 
 * 사용 방법:
 * 1. package.json에 다음 패키지 추가:
 *    "@socket.io/redis-adapter": "^8.2.0"
 *    "redis": "^4.6.0"
 * 
 * 2. main.ts에서 Redis adapter 초기화:
 *    const adapter = await createRedisAdapter();
 * 
 * 3. WebSocketGateway 설정에 adapter 추가:
 *    @WebSocketGateway({
 *      adapter: adapter,
 *      // ... 기타 설정
 *    })
 * 
 * 참고: 현재는 예시 파일이며, 실제 적용 시 meta-veiwers.gateway.ts를 수정해야 합니다.
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export async function setupRedisAdapter() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
  subClient.on('error', (err) => console.error('Redis Sub Error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  return createAdapter(pubClient, subClient);
}





