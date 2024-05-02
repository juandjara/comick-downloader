import Image, { ImageProps } from "@/components/Image"
import { IconCheck, IconClose } from "@/components/icons"
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
    { title: "Manga-FS-Download" },
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
      <Form>
        <div>
          <input
            name="q"
            type="text"
            className="w-full border border-gray-300 px-3 py-2 rounded-md disabled:bg-gray-100 disabled:pointer-events-none"
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
        </div>
      </Form>
      {busy && (
        <div className="text-center mt-4">Loading...</div>
      )}
      {results.length === 0 && !busy && q && (
        <div className="text-center mt-4">No results found</div>
      )}
      {results.length > 0 && !busy && (
        <div className="mt-4">
          <h2 className="text-lg font-medium px-2">
            Results
          </h2>
          <ul>
            {results.map((result) => (
              <li key={result.hid} className="p-4 border-b my-2 flex items-stretch gap-2">
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
  const { results, recent } = useLoaderData<typeof loader>()
  return (
    results.length === 0 && (
      <div className="mt-4">
        <h2 className="text-lg font-medium px-2 mb-2">
          Recent searches
        </h2>
        {recent.length === 0 && (
          <p className="px-2 text-gray-500 font-light text-sm">
            No recent searches
          </p>
        )}
        <ul>
          {recent.map((q) => (
            <li key={q}>
              <Link to={`/?q=${q}`} className="p-3 border-b block">
                {q}
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
      <div className="mt-4">
        <h2 className="text-lg font-medium px-2 mb-2 mt-8">
          Download queue
        </h2>
        <ul>
          {_jobs.map((job) => (
            <li key={job.id} className="p-4 border-b my-2 flex items-start gap-2">
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
      <div title={`Downloaded at ${job.returnvalue}`}>
        <p>Completed</p>
        <div className='bg-green-500 text-white p-1 rounded-md w-min ml-auto'>
          <IconCheck />
        </div>
      </div>
    )
  }
  if (job.failedReason) {
    icon = (
      <div title={job.failedReason}>
        <p>Failed</p>
        <div className='bg-red-500 text-white p-1 rounded-md w-min ml-auto'>
          <IconClose />
        </div>
      </div>
    )
  }

  return icon
}
