import { useNavigation, useRevalidator } from "@remix-run/react"
import { Job } from "bullmq"
import { useEffect } from "react"

// revalidate every 1 seconds if there is some active job and there is not another request in progress
export default function useJobsRevalidator(jobs: Job[]) {
  const transition = useNavigation()
  const busy = transition.state !== 'idle'
  const revalidator = useRevalidator()

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const someJobActive = jobs.some((j) => !j.failedReason && !j.returnvalue)

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
}