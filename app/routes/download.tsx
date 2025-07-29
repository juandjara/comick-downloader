import { processFileParam } from '@/lib/process-file-param.server'
import {
  LoaderFunctionArgs,
  createReadableStreamFromReadable,
} from '@remix-run/node'
import { createReadStream } from 'fs'
import path from 'path'

export async function loader({ request }: LoaderFunctionArgs) {
  const file = await processFileParam(request, 'file')
  const stream = createReadStream(file)

  return new Response(createReadableStreamFromReadable(stream), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${path.basename(file)}"`,
    },
  })
}
