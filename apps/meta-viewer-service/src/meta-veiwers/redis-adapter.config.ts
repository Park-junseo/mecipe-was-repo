import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Adapter configuration for Socket.IO
 * This enables socket communication across multiple replicas in Kubernetes
 */
export async function createRedisAdapter() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const pubClient: RedisClientType = createClient({
    url: redisUrl,
  });

  const subClient: RedisClientType = pubClient.duplicate();

  // Error handling
  pubClient.on('error', (err) => {
    console.error('Redis Pub Client Error:', err);
  });

  subClient.on('error', (err) => {
    console.error('Redis Sub Client Error:', err);
  });

  // Connect to Redis
  await Promise.all([pubClient.connect(), subClient.connect()]);

  console.log('✅ Redis adapter connected for Socket.IO');

  return createAdapter(pubClient, subClient);
}





