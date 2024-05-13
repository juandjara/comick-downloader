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
  const url = `${BASE_URL}/v1.0/search?q=${q}`
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

  return { action }
}

export default function Index() {
  const { results, recent } = useLoaderData<typeof loader>()
  
  const [sp] = useSearchParams()
  const q = sp.get("q") || ''

  const { state } = useNavigation()
  const busy = state !== "idle" 

  return (
    <main className="max-w-screen-lg mx-auto p-4">
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
          <h2 className="text-xl font-medium px-2">
            Results
          </h2>
          <ul className="divide-y">
            {results.map((result) => (
              <li key={result.hid} className="p-4 my-2 flex items-stretch gap-2 hover:bg-gray-100 transition-colors">
                <Image w={100} h={100} b2key={result.md_covers[0]?.b2key} />
                <Link to={`/comic/${result.hid}`} className="flex-grow text-lg font-semibold">{result.title}</Link>
                <a href={`https://comick.io/comic/${result.slug}`}>Link</a>
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

  console.log(files)

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
