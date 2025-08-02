import Image, { ImageProps } from '@/components/Image'
import {
  IconArrowBack,
  IconCheck,
  IconClose,
  IconDownload,
  IconLoading,
  IconReload,
} from '@/components/icons'
import { BASE_URL } from '@/config'
import {
  type DownloadPayload,
  downloadQueue,
  DownloadMeta,
  retryDownload,
  downloadChapter,
} from '@/lib/download-queue.server'
import { tryGetJSON } from '@/request'
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import {
  Form,
  Link,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
  useSubmit,
} from '@remix-run/react'
import { Job } from 'bullmq'
import clsx from 'clsx'
import { useMemo } from 'react'
import langOptions from '@/lib/langs.json'
import { getFiles } from '@/lib/scan.queue'
import useJobsRevalidator from '@/lib/useJobsRevalidator'

type Comic = {
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
type Chapter = {
  hid: string
  chap: number
  vol: number
  title: string
  group_name: string[]
  updated_at: string
}
type FullChapter = Chapter & { md_images: ImageProps[] }

const DEFAULT_LIMIT = 20

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id
  const headerLang = request.headers.get('Accept-Language') || ''
  const headerLangPart = headerLang.split(',')[0].split('-')[0]
  const sp = new URL(request.url).searchParams
  const lang = sp.get('lang') || '' || headerLangPart || 'en'

  const remoteSP = new URLSearchParams()
  remoteSP.set('lang', lang)
  remoteSP.set('chap', sp.get('q') || '')
  remoteSP.set('chap-order', sp.get('order') || '0')
  remoteSP.set('page', sp.get('page') || '1')
  remoteSP.set('limit', sp.get('limit') || String(DEFAULT_LIMIT))

  const [files, jobs, comic, chapters] = await Promise.all([
    getFiles(),
    downloadQueue.getJobs(),
    tryGetJSON<Comic, { error: true }>(
      { error: true },
      `${BASE_URL}/comic/${id}?tachiyomi=true`,
    ),
    tryGetJSON<{ chapters: FullChapter[] }>(
      { chapters: [] },
      `${BASE_URL}/comic/${id}/chapters?${remoteSP.toString()}`,
    ),
  ])
  return {
    files,
    jobs,
    comicRequest: comic,
    chaptersRequest: chapters,
    lang,
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData()
  const action = fd.get('_action')
  const id = fd.get('chapter_id') as string
  const meta = JSON.parse(fd.get('meta') as string) as DownloadMeta

  if (action === 'download') {
    await downloadChapter(id, meta)
  }
  if (action === 'retry') {
    await retryDownload(id)
  }

  return null
}

export default function Comic() {
  const { comicRequest, chaptersRequest, lang } = useLoaderData<typeof loader>()
  const hasError = comicRequest.error || chaptersRequest.error
  const comic = comicRequest.error ? null : (comicRequest.data as Comic)
  const chapters = chaptersRequest.data.chapters

  const revalidator = useRevalidator()
  const submit = useSubmit()
  const transition = useNavigation()
  const busy = transition.state !== 'idle'
  const [sp, setSearchParams] = useSearchParams()
  const q = sp.get('q') || ''
  const order = sp.get('order') || '0'
  const page = sp.get('page') || '1'

  const langs = useMemo(() => {
    return comic?.langList
      ? langOptions.filter((l) => comic.langList.includes(l.code))
      : []
  }, [comic?.langList])

  function updatePage(page: number) {
    setSearchParams(
      (prev) => {
        prev.set('page', String(page))
        return prev
      },
      { preventScrollReset: true },
    )
  }

  if (hasError || !comic) {
    return (
      <main className="max-w-screen-lg mx-auto p-4">
        <Link to="/">
          <button className="flex items-center gap-2 px-2 py-1 mb-2 border rounded-md hover:bg-gray-50 transition-colors">
            <IconArrowBack />
            <p>Back</p>
          </button>
        </Link>
        <div className="mt-8">
          <h2 className="text-xl flex-grow mb-2 text-red-700">
            Error fetching comic results
          </h2>
          <button
            className="flex items-center gap-2 px-2 py-1 border rounded-md hover:bg-gray-50 transition-colors"
            disabled={busy}
            onClick={() => revalidator.revalidate()}
          >
            <IconReload />
            <p>Retry</p>
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-screen-lg mx-auto p-4">
      <Link to="/">
        <button className="flex items-center gap-2 px-2 py-1 mb-2 border rounded-md hover:bg-gray-50 transition-colors">
          <IconArrowBack />
          <p>Back</p>
        </button>
      </Link>
      <div className="flex flex-col md:flex-row gap-3 items-start">
        <Image w={200} h={200} b2key={comic.comic.md_covers[0]?.b2key} />
        <div>
          <h3 className="text-2xl font-semibold mb-1">
            {comic.comic.title}{' '}
            <span className="text-sm font-normal">({comic.comic.year})</span>
          </h3>
          <p className="mb-1">
            {comic.authors.map((a: { name: string }) => a.name).join(', ')}
          </p>
          <p className="text-sm mb-4">{comic.demographic}</p>
          <p
            className="my-4 prose prose-hr:mb-5 prose-hr:mt-0"
            dangerouslySetInnerHTML={{ __html: comic.comic.parsed }}
          ></p>
          <ul className="flex flex-wrap gap-1 my-4 text-xs">
            {comic.comic.md_comic_md_genres.map(
              (g: { md_genres: { slug: string; name: string } }) => (
                <li
                  className="bg-gray-200 rounded-md px-1 py-0.5"
                  key={g.md_genres.slug}
                >
                  {g.md_genres.name}
                </li>
              ),
            )}
          </ul>
          <Form
            className="py-4"
            onChange={(ev) =>
              submit(ev.currentTarget, { preventScrollReset: true })
            }
          >
            <div>
              <label className="mr-2" htmlFor="lang">
                Language
              </label>
              <select
                id="lang"
                name="lang"
                defaultValue={lang}
                className="px-2 py-1 rounded-md"
              >
                {langs.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.lang}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                name="q"
                type="text"
                className="max-w-xs border border-gray-300 px-2 py-1 rounded-sm disabled:bg-gray-100 disabled:pointer-events-none"
                placeholder="Search chapter number"
                defaultValue={q}
                disabled={busy}
              />
              <div className="flex-grow"></div>
              <div>
                <label className="mr-2" htmlFor="order">
                  Order
                </label>
                <select
                  id="order"
                  name="order"
                  defaultValue={order}
                  className="px-2 py-1 rounded-md"
                >
                  <option value="0" aria-label="Descending sort">
                    ⬇️
                  </option>
                  <option value="1" aria-label="Ascending sort">
                    ⬆️
                  </option>
                </select>
              </div>
            </div>
          </Form>
          <ChapterList />
          <div className="flex items-center justify-between gap-2 m-3">
            <button
              className={clsx(
                'flex items-center gap-1 px-3 py-1 border rounded-md',
                'bg-gray-50 hover:bg-gray-100 transition-colors',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
              disabled={page <= '1'}
              onClick={() => updatePage(Number(page) - 1)}
            >
              <IconArrowBack />
              <p>Prev</p>
            </button>
            <p>Page {page}</p>
            <button
              className={clsx(
                'flex items-center gap-1 px-3 py-1 border rounded-md',
                'bg-gray-50 hover:bg-gray-100 transition-colors',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
              disabled={chapters.length < DEFAULT_LIMIT}
              onClick={() => updatePage(Number(page) + 1)}
            >
              <p>Next</p>
              <IconArrowBack className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

// this component will never be renderer on error, so asume all data is ok
function ChapterList() {
  const { files, jobs, comicRequest, chaptersRequest, lang } =
    useLoaderData<typeof loader>()

  const comic = comicRequest.data as Comic
  const chapters = chaptersRequest.data.chapters

  const transition = useNavigation()
  const busy = transition.state !== 'idle'
  const isPost = transition.formMethod === 'POST'

  useJobsRevalidator(jobs as Job[])

  function isDownloading(id: string) {
    return (jobs as Job<DownloadPayload>[]).some((j) => {
      return j.data.chapter_id === id && !j.failedReason && !j.returnvalue
    })
  }
  function isError(id: string) {
    return (jobs as Job<DownloadPayload>[]).some((j) => {
      return j.data.chapter_id === id && j.failedReason
    })
  }
  function isCompleted(id: string) {
    const c = chapters.find((c) => c.hid === id)
    const file = c && getFile(c)

    return (
      !!file ||
      (jobs as Job<DownloadPayload>[]).some((j) => {
        return j.data.chapter_id === id && j.returnvalue
      })
    )
  }

  function getIcon(id: string) {
    if (isDownloading(id)) {
      return <IconLoading />
    } else if (isCompleted(id)) {
      return <IconCheck />
    } else if (isError(id)) {
      return <IconClose />
    }
    return <IconDownload />
  }

  function getTooltip(id: string) {
    const job = (jobs as Job<DownloadPayload>[]).find(
      (j) => j.data.chapter_id === id,
    )
    if (job) {
      if (job.failedReason) {
        return job.failedReason
      } else if (job.returnvalue) {
        return `Downloaded at ${job.returnvalue}`
      } else {
        const progress = typeof job.progress === 'number' ? job.progress : 0
        return `Downloading... ${Math.round(progress * 100)}%`
      }
    }
    return 'Download'
  }

  function getChapterMeta(c: Chapter) {
    return JSON.stringify({
      lang,
      comic_id: comic.comic.hid,
      comic_title: comic.comic.title,
      chapter_title: c.title,
      chapter_number: c.chap,
      vol_number: c.vol,
      fansub_group: c.group_name.join(', '),
    })
  }

  function getFile(c: Chapter) {
    const file = files.find(
      (f) =>
        f.parts?.comic_id === comic.comic.hid &&
        f.parts.chapter_number === String(c?.chap) &&
        f.parts.lang === lang &&
        f.parts.fansub_group === c.group_name.join(', '),
    )
    return file && `${file.path}/${file.name}`
  }

  return (
    <ul className="mt-2 mb-4 divide-y border-b border-t">
      {chapters.map((c) => (
        <li key={c.hid} className="relative p-3">
          <Link to={`/comic/${comic.comic.hid}/${c.hid}`} />
          <div className="flex items-center gap-2">
            <p className="flex-grow flex gap-1 md:gap-2 flex-wrap">
              <strong className="font-medium">Ch. {c.chap}</strong>
              <span className="font-light">{c.title}</span>
            </p>
            {c.vol && <p className="whitespace-nowrap">Vol {c.vol}</p>}
            {isCompleted(c.hid) ? (
              <Link
                to={`/read?file=${encodeURIComponent(getFile(c) ?? '')}`}
                className={clsx(
                  'hover:bg-green-400 bg-green-500 text-white',
                  'p-1 rounded-md',
                )}
              >
                <IconCheck />
              </Link>
            ) : (
              <Form className="inline" method="POST">
                <input type="hidden" name="chapter_id" value={c.hid} />
                <input type="hidden" name="meta" value={getChapterMeta(c)} />
                <button
                  className={clsx(
                    'p-1 rounded-md bg-gray-200 hover:bg-gray-300 disabled:pointer-events-none disabled:opacity-50',
                    {
                      'hover:bg-green-400 bg-green-500 text-white': isCompleted(
                        c.hid,
                      ),
                      'hover:bg-red-400 bg-red-500 text-white':
                        isError(c.hid) && !isCompleted(c.hid),
                    },
                  )}
                  aria-label="download"
                  title={getTooltip(c.hid)}
                  type="submit"
                  name="_action"
                  value={isError(c.hid) ? 'retry' : 'download'}
                  disabled={busy && isPost}
                >
                  {getIcon(c.hid)}
                </button>
              </Form>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="flex-grow">
              <small>{c.group_name.join(', ')}</small>
            </p>
            <p>
              <small>
                {new Date(c.updated_at).toLocaleString(lang, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </small>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
