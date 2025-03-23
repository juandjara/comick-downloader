import { DownloadPayload } from "@/lib/download-queue.server"
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react"
import { Job } from "bullmq"
import { IconCheck, IconClose, IconLoading } from "./icons"
import { loader } from '@/routes/_index'
import langs from '@/lib/langs.json'
import useJobsRevalidator from "@/lib/useJobsRevalidator"

const langMap = Object.fromEntries(
  langs.map((lang) => [lang.code, lang])
)

export default function JobList() {
  const { jobs } = useLoaderData<typeof loader>()
  const _jobs = jobs as Job<DownloadPayload, string>[]
  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  useJobsRevalidator(jobs as Job[])

  return (
    _jobs.length > 0 && (
      <div className="mt-8">
        <div className="px-3 mb-2 flex items-center">
          <h2 className="flex-grow text-xl font-medium">
            Recent downloads
          </h2>
          <Form className='inline' method='POST'>
            <button
              className='flex items-center gap-2 px-2 py-1 border rounded-md hover:bg-gray-50 transition-colors'
              type="submit"
              name="_action"
              value="clear-jobs"
              disabled={busy}
            >
              <IconClose />
              <p>Clear</p>
            </button>
          </Form>
        </div>
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

