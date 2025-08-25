import { ImageProps } from "@/components/Image"
import { BASE_URL, IMAGE_PREFIX } from "@/config"
import { getJSON, tryGetJSON, wrapData } from "@/request"
import { updateRecentQueries } from "./search.server"

export type SearchResult = {
  hid: string
  slug: string
  title: string
  md_covers: ImageProps[]
}
export type Comic = {
  demographic: string
  authors: { name: string }[]
  chapters: Chapter[]
  langList: string[]
  comic: {
    hid: string
    title: string
    year: number
    parsed: string
    md_covers: ImageProps[]
    md_comic_md_genres: { md_genres: { slug: string; name: string } }[]
  }
}
export type Chapter = {
  hid: string
  chap: number
  vol: number
  title: string
  group_name: string[]
  updated_at: string
}
type FullChapter = Chapter & { md_images: ImageProps[] }


export async function search(q: string | null) {
  if (!q) {
    return wrapData([] as SearchResult[])
  }
  const [results] = await Promise.all([
    tryGetJSON<SearchResult[]>(
      [],
      `${BASE_URL}/v1.0/search?q=${q}&tachiyomi=true`,
    ),
    updateRecentQueries(q),
  ])
  return results
}

export async function getComic(id: string) {
  return tryGetJSON<Comic, { error: true }>(
    { error: true },
    `${BASE_URL}/comic/${id}?tachiyomi=true`,
  )
}

export enum ChapterOrder {
  Desc = 0,
  Asc = 1,
}

type ChapterListParams = {
  id: string
  lang: string
  q?: string
  order?: ChapterOrder
  page?: number
  limit?: number
}
const DEFAULT_LIMIT = 20

export async function getComicChapters({
  id,
  lang,
  q = '',
  order = ChapterOrder.Desc,
  page = 1,
  limit = DEFAULT_LIMIT,
}: ChapterListParams) {
  const sp = new URLSearchParams()
  sp.set('lang', lang)
  sp.set('chap', q)
  sp.set('order', String(order))
  sp.set('page', String(page))
  sp.set('limit', String(limit))

  return tryGetJSON<{ chapters: FullChapter[] }>(
    { chapters: [] },
    `${BASE_URL}/comic/${id}/chapters?${sp.toString()}`,
  )
}

type SingleChapter = {
  seoTitle: string
  chapter: {
    images: { url: string; w: number; h: number }[]
  }
}

export async function getChapterImages(id: string) {
  const data = await getJSON<SingleChapter>(`${BASE_URL}/chapter/${id}?tachiyomi=true`)
  const urls = data.chapter.images.map((image) => {
    const key = new URL(image.url).pathname.slice(1)
    return {
      url: `${IMAGE_PREFIX}/${key}?tachiyomi=true`,
      key
    }
  })
  return urls
}
