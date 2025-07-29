import { STORAGE_PATH } from './config.server'
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

export default async function processFileParam(
  request: Request,
  param: string,
) {
  const _file = new URL(request.url).searchParams.get(param) as string

  if (!_file) {
    throw new Response('missing ?file param', { status: 400 })
  }

  const file = safeJoin(STORAGE_PATH, _file)

  if (!fileExists(file)) {
    throw new Response('file not found', { status: 404 })
  }

  return file
}
