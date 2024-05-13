import path from 'path'

export const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), './storage')
