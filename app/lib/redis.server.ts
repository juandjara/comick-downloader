import Redis, { type RedisOptions } from "ioredis"

let redis: Redis

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the Redis with every change either.

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

if (process.env.NODE_ENV === "production") {
  redis = new Redis(REDIS_URL, redisOptions)
} else {
  const _global = global as typeof globalThis & { __redis: Redis | undefined }
  if (!_global.__redis) {
    _global.__redis = new Redis(REDIS_URL, redisOptions)
  }
  redis = _global.__redis
}

export { redis }
