import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react"
import { IconClose, IconSearch } from "./icons"
import { loader } from '@/routes/_index'

export default function RecentQueries() {
  const { recent } = useLoaderData<typeof loader>()
  const { state } = useNavigation()
  const busy = state !== "idle" 

  return (
    recent.length > 0 && (
      <div className="mt-8">
        <div className="px-3 mb-2 flex items-center">
          <h2 className="flex-grow text-xl font-medium">
            Recent searches
          </h2>
          <Form className='inline' method='POST'>
            <button
              className='flex items-center gap-2 px-2 py-1 border rounded-md hover:bg-gray-50 transition-colors'
              type="submit"
              name="_action"
              value="clear-recent"
              disabled={busy}
            >
              <IconClose />
              <p>Clear</p>
            </button>
          </Form>
        </div>
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
