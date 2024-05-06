import { Queue as BullQueue, Worker, type Processor } from 'bullmq'
import { redis } from './redis.server'

type RegisteredQueue = {
  queue: BullQueue
  worker: Worker
}

const _global =
  global as typeof globalThis & { __registeredQueues: Record<string, RegisteredQueue> | undefined }

const registeredQueues =
  _global.__registeredQueues || (_global.__registeredQueues = {})

export function registerQueue<Payload>(
  name: string,
  handler: Processor<Payload>,
) {
  if (registeredQueues[name]) {
    return registeredQueues[name].queue
  }

  // Queues store the jobs in the Redis database
  const queue = new BullQueue<Payload>(name, { connection: redis })
  queue.on('error', (err) => {
    console.error(`Queue ${name} error:`, err)
  })

  // Workers reach out to our redis connection and pull jobs off the queue
  // jobs are pulled out in a synchronous manner, so jobs are processed one at a time
  const worker = new Worker(name, handler, { connection: redis })
  worker.on('error', (err) => {
    console.error(`Worker ${name} error:`, err)
  })

  ;['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, closing server...`)
      await queue.close()
      await worker.close()
      process.exit(0)
    })
  })

  registeredQueues[name] = { queue, worker }

  return queue
}
