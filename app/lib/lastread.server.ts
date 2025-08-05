import { STORAGE_PATH } from "./config.server"
import { redis } from "./redis.server"

export async function getLastRead() {
  const data = await redis.zrevrange("lastRead", 0, 9)
  return data
}

export async function updateLastRead(path: string) {
  await redis.zadd("lastRead", Date.now(), path.replace(STORAGE_PATH, ''))
}

export async function clearLastRead() {
  await redis.del('lastRead')
}
