import Image, { ImageProps } from "@/components/Image"
import JobList from "@/components/JobList"
import RecentQueries from "@/components/RecentQueries"
import { IconClose, IconSearch } from "@/components/icons"
import { BASE_URL } from "@/config"
import { STORAGE_PATH } from "@/lib/config.server"
import { downloadQueue } from "@/lib/download-queue.server"
import { getFiles, scanQueue } from "@/lib/scan.queue"
import { updateRecentQueries, getRecentQueries } from "@/lib/search.server"
import { getJSON } from "@/request"
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react"
import clsx from "clsx"

export const meta: MetaFunction = () => {
  return [
    { title: "Comick Downloader" },
    { name: "description", content: "Download manga from comick.io to your filesystem" },
  ]
}

type SearchResult = {
  hid: string
  slug: string
  title: string
  md_covers: ImageProps[]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get("q")
  const url = `${BASE_URL}/v1.0/search?q=${q}&tachiyomi=true`
  const recent = await getRecentQueries()
  const files = await getFiles()
  const jobs = await downloadQueue.getJobs()

  if (!q) {
    return {
      results: [],
      recent,
      jobs,
      files
    }
  }

  const [results] = await Promise.all([
    getJSON<SearchResult[]>(url),
    updateRecentQueries(q)
  ])

  return {
    results,
    recent,
    jobs,
    files
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData()
  const action = fd.get('_action')
  if (action === 'scan') {
    await scanQueue.add('scan', { path: STORAGE_PATH })
  }
  if (action === 'clear') {
    await downloadQueue.clean(30 * 1000, 5000, 'failed')
    await downloadQueue.clean(30 * 1000, 5000, 'completed')
  }

  return { action }
}

export default function Index() {
  const { results, recent } = useLoaderData<typeof loader>()
  
  const [sp] = useSearchParams()
  const q = sp.get("q") || ''

  const { state } = useNavigation()
  const busy = state !== "idle" 

  return (
    <main className="max-w-screen-lg mx-auto py-4 px-2">
      <h1 className="text-center text-2xl my-4">
        Comick Downloader
      </h1>
      <Form>
        <div className="relative">
          <input
            name="q"
            type="text"
            className="w-full border border-gray-300 pl-3 pr-10 py-2 rounded-md disabled:bg-gray-100 disabled:pointer-events-none"
            placeholder="search titles on comick.io"
            defaultValue={q}
            disabled={busy}
            list={recent.length > 0 ? "recent-queries" : undefined}
          />
          {recent.length > 0 && (
            <datalist id="recent-queries">
              {recent.map((q) => (
                <option key={q} value={q} />
              ))}
            </datalist>
          )}
          {q ? (
            <Link to='/' className="absolute right-0 top-0">
              <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 transition-colors rounded-md">
                <IconClose
                  width={24}
                  height={24}
                />
              </button>
            </Link>
          ) : (
            <button className="absolute right-0 top-0 p-2 text-gray-500 hover:bg-gray-100 rounded-md">
              <IconSearch
                width={24}
                height={24}
              />
            </button>
          )}
        </div>
      </Form>
      {results.length === 0 && !busy && q && (
        <div className="text-center mt-4">No results found</div>
      )}
      {results.length > 0 && !busy && (
        <div className="mt-8">
          <h2 className="text-2xl mb-2">
            Results
          </h2>
          <ul>
            {results.map((result) => (
              <li
                key={result.hid}
                className="border-t border-gray-300 cursor-pointer relative pb-3 flex items-stretch gap-2 hover:bg-gray-100 transition-colors"
              >
                <Link
                  to={`/comic/${result.hid}`}
                  className="absolute inset-0 w-full h-full"
                >
                  <span className="hidden">{result.title}</span>
                </Link>
                <Image w={120} h={120} b2key={result.md_covers[0]?.b2key} />
                <div className="flex-grow">
                  <p className="pt-1 text-lg font-semibold">{result.title}</p>
                  <a className="hover:underline text-xs" href={`https://comick.io/comic/${result.slug}`}>source</a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <RecentQueries />
      <JobList />
      <FSInfo />
    </main>
  )
}

function FSInfo() {
  const { files } = useLoaderData<typeof loader>()
  const { state } = useNavigation()
  const busy = state !== "idle"

  console.log('Filesystem files: ', files)

  return (
    <div className="mt-8">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-medium px-3 my-3">
          Filesystem
        </h2>
        <Form method="POST">
          <button
            type='submit'
            name='_action'
            value='scan'
            disabled={busy}
            className={clsx(
              'px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            Scan Filesystem
          </button>
        </Form>
      </header>
      <ul className="divide-y">
        {files.map((file) => (
          <li key={file.name} className="p-4 flex items-stretch gap-2 hover:bg-gray-100 transition-colors">
            <p>
              <span>{file.series}</span> / <span className="text-gray-500 text-sm">{file.name}</span>
            </p>
            {/* <div className="w-16 h-16 bg-gray-200 rounded-md" />
            <div className="flex-grow">
              {file.name}
            </div>
            <div>
              <button className="p-2 text-gray-500 hover:bg-gray-100 transition-colors rounded-md">
                <IconClose
                  width={24}
                  height={24}
                />
              </button>
            </div> */}
          </li>
        ))}
      </ul>
    </div>
  )
}
