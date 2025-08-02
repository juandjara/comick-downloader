import { Form, Link, useLoaderData, useNavigation } from '@remix-run/react'
import { type loader } from '../routes/_index'
import useJobsRevalidator from '@/lib/useJobsRevalidator'
import { Job, JobJson } from 'bullmq'
import { IconSearch } from './icons'
import { type ScanResult } from '@/lib/scan.queue'

export default function FSInfo() {
  const { files, scanJobs } = useLoaderData<typeof loader>()
  const { state } = useNavigation()
  const busy = state !== 'idle'

  // NOTE: scanJobs can contain 1 failed AND 1 completed job
  const lastJob = (scanJobs as JobJson[]).sort(
    (a, b) => b.timestamp - a.timestamp,
  )[0]
  const isError = !!lastJob?.failedReason
  const isScanning = lastJob && !lastJob?.returnvalue && !lastJob?.failedReason

  useJobsRevalidator(scanJobs as Job[])

  const matchedFiles = files.filter((f) => f.parts)
  const unmatchedFiles = files.filter((f) => !f.parts)

  function getFilePath(file: Partial<ScanResult>) {
    return encodeURIComponent(`${file.path}/${file.name}`)
  }

  return (
    <div className="mt-8">
      <header className="px-3 my-3 flex items-center justify-between">
        <h2 className="flex-grow text-xl font-medium">Files downloaded</h2>
        <Form method="POST">
          <button
            type="submit"
            name="_action"
            value="scan"
            disabled={busy || isScanning}
            className="flex items-center gap-2 px-2 py-1 border rounded-md hover:bg-gray-50 transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            <IconSearch />
            <p>{isScanning ? 'Scanning...' : 'Scan Filesystem'}</p>
          </button>
        </Form>
      </header>
      {isError ? (
        <p className="text-red-700 px-3 pb-4">Error: {lastJob.failedReason}</p>
      ) : null}
      <details>
        <summary className="px-3 py-1">
          {matchedFiles.length} file(s) identified
        </summary>
        <ul className="my-2">
          {matchedFiles.map((file) => (
            <li
              key={file.name}
              className="flex items-stretch gap-2 hover:bg-gray-100 transition-colors"
            >
              <Link
                className="block w-full p-3"
                to={`/read?file=${getFilePath(file)}`}
              >
                {file.name}
              </Link>
            </li>
          ))}
        </ul>
      </details>
      <details className="my-3">
        <summary className="px-3 py-1">
          {unmatchedFiles.length} file(s) not identified
        </summary>
        <ul className="my-2">
          {unmatchedFiles.map((file) => (
            <li key={file.name}>
              <p className="p-3">{file.name}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
