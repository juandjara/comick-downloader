import { DownloadPayload } from "@/lib/download-queue.server"
import { Link, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react"
import { Job } from "bullmq"
import { IconCheck, IconClose, IconLoading } from "./icons"
import { loader } from '@/routes/_index'
import { useEffect } from "react"
import langs from '@/lib/langs.json'

const langMap = Object.fromEntries(
  langs.map((lang) => [lang.code, lang])
)

export default function JobList() {
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
          Recent downloads
        </h2>
        <ul className="divide-y">
          {_jobs.map((job) => (
            <li key={job.id} className="p-4 flex items-center gap-2 hover:bg-gray-100 transition-colors">
              <Link
                className="flex-grow"
                to={`/comic/${job.data.meta.comic_id}?lang=${job.data.meta.lang}`}
              >
                <p className="mb-1 text-sm text-gray-500">
                  {new Date(job.timestamp).toLocaleString()}
                </p>
                <p className="mb-1">
                  {job.data.meta.comic_title}
                  {' - '}
                  Chapter {job.data.meta.chapter_number} ({langMap[job.data.meta.lang].lang})
                </p>
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
    <div className="flex gap-2">
      <p>Downloading... {Math.round(progress * 100)}%</p>
      <div className='p-1 rounded-md block bg-gray-200'>
        <IconLoading />
      </div>
    </div>
  )

  if (job.returnvalue) {
    icon = (
      <Link
        download
        target="_blank"
        rel="noreferrer noopener"
        to={`/jobresult/${job.id}`}
        className="flex gap-2"
        title={`Downloaded at ${job.returnvalue}`}
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

