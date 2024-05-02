import { downloadQueue } from '@/lib/download-queue.server'
import { LoaderFunctionArgs, createReadableStreamFromReadable } from '@remix-run/node'
import { createReadStream } from 'fs'
import path from 'path'

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id as string
  const job = await downloadQueue.getJob(id)

  if (!job) {
    return new Response('Job not found', { status: 404 })
  }

  const _path = path.resolve(job.returnvalue)
  const stream = createReadStream(_path)

  return new Response(
    createReadableStreamFromReadable(stream),
    {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${path.basename(_path)}"`,
      },
    }
  )
}
