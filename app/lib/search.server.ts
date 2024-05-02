import { redis } from "./redis.server"

export async function getRecentQueries() {
  const data = await redis.zrevrange("recentQueries", 0, 9)
  return data
}

export async function updateRecentQueries(q: string) {
  await redis.zadd("recentQueries", Date.now(), q)
}
