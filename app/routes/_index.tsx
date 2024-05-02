import Image, { ImageProps } from "@/components/Image"
import { IconCheck, IconClose, IconSearch } from "@/components/icons"
import { BASE_URL } from "@/config"
import { DownloadPayload, downloadQueue } from "@/lib/download-queue.server"
import { updateRecentQueries, getRecentQueries } from "@/lib/search.server"
import { getJSON } from "@/request"
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation, useRevalidator, useSearchParams } from "@remix-run/react"
import { Job } from "bullmq"
import { useEffect } from "react"

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
  const jobs = await downloadQueue.getJobs()

  if (!q) {
    return {
      results: [],
      recent,
      jobs
    }
  }

  const [results] = await Promise.all([
    getJSON<SearchResult[]>(url),
    updateRecentQueries(q)
  ])

  return {
    results,
    recent,
    jobs
  }
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
      {busy && (
        <div className="text-center mt-4">Loading...</div>
      )}
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
    </main>
  )
}

function RecentQueries() {
  const { recent } = useLoaderData<typeof loader>()
  return (
    recent.length > 0 && (
      <div className="mt-8">
        <h2 className="text-xl font-medium px-3 mb-2">
          Recent searches
        </h2>
        <ul className="divide-y">
          {recent.map((q) => (
            <li key={q}>
              <Link
                to={`/?q=${q}`}
                className="p-3 flex gap-1 items-center hover:bg-gray-100 transition-colors"
              >
                <span className="flex-grow">{q}</span>
                <IconSearch />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  )
}

function JobList() {
  const { jobs } = useLoaderData<typeof loader>()
  const _jobs = jobs as Job<DownloadPayload, string>[]
  const transition = useNavigation()
  const busy = transition.state !== 'idle'
  const revalidator = useRevalidator()

  // revalidate every 1 seconds if there is some active job and there is not another request in progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const someJobActive = (jobs as Job<DownloadPayload>[]).some((j) => !j.failedReason && !j.returnvalue)

    if (busy) {
      if (interval) {
        clearInterval(interval)
      }
    } else if (someJobActive) {
      interval = setInterval(() => {
        revalidator.revalidate()
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [busy, jobs, revalidator])

  return (
    _jobs.length > 0 && (
      <div className="mt-8">
        <h2 className="text-xl font-medium px-3 mb-2">
          Download queue
        </h2>
        <ul className="divide-y">
          {_jobs.map((job) => (
            <li key={job.id} className="p-4 flex items-center gap-2 hover:bg-gray-100 transition-colors">
              <Link
                className="flex-grow"
                to={`/comic/${job.data.meta.comic_id}?lang=${job.data.meta.lang}`}
              >
                <p className="mb-1 text-sm text-gray-500">{job.data.meta.comic_title}</p>
                <p className="mb-1">
                  <span className="font-medium"> Ch. {job.data.meta.chapter_number} </span>
                  <span className="text-gray-500">{job.data.meta.chapter_title}</span>
                </p>
                <p className="text-xs">{job.data.meta.lang}</p>
              </Link>
              <JobIndicator job={job} />
            </li>
          ))}
        </ul>
      </div>
    )
  )
}

function JobIndicator({ job }: { job: Job<DownloadPayload, string> }) {
  const progress = typeof job.progress === 'number' ? job.progress : 0
  let icon = (
    <div>
      <p>Downloading... {Math.round(progress * 100)}%</p>
      <progress
        className="rounded-md"
        value={progress}
        max={1}
      />
    </div>
  )
  if (job.returnvalue) {
    icon = (
      <Link
        download
        target="_blank"
        rel="noreferrer noopener"
        to={`/jobresult/${job.id}`}
        className="flex gap-2" title={`Downloaded at ${job.returnvalue}`}
      >
        <p className="text-sm text-gray-500">Completed</p>
        <IconCheck width={24} height={24} className='bg-green-500 text-white p-1 rounded-md block' />
      </Link>
    )
  }
  if (job.failedReason) {
    icon = (
      <div className="flex gap-2" title={job.failedReason}>
        <p className="text-sm text-gray-500">Failed</p>
        <IconClose width={24} height={24} className='bg-red-500 text-white p-1 rounded-md block' />
      </div>
    )
  }

  return icon
}
