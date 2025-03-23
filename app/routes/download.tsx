import { STORAGE_PATH } from "@/lib/config.server"
import { LoaderFunctionArgs, createReadableStreamFromReadable } from "@remix-run/node"
import { createReadStream } from 'fs'
import fs from 'fs/promises'
import path from 'path'

async function fileExists(filename: string) {
  try {
    await fs.access(filename, fs.constants.R_OK) // check file exists and is readable
    return true
  } catch (err) {
    return false
  }
}

function safeJoin(base: string, file: string) {
  const file2 = path.join('/', file) // removes all `../` by making the file relative to root `/`
  return path.join(base, file2)
}

export async function loader({ request }: LoaderFunctionArgs) {
  const _file = new URL(request.url).searchParams.get('file') as string

  if (!_file) {
    return new Response('missing ?file param', { status: 400 })
  }

  const file = safeJoin(STORAGE_PATH, _file)

  if (!fileExists(file)) {
    return new Response('file not found', { status: 404 })
  }

  const stream = createReadStream(file)

  return new Response(
    createReadableStreamFromReadable(stream),
    {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${path.basename(file)}"`,
      },
    }
  )
}