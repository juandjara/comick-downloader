import { Link, useLoaderData } from "@remix-run/react"
import { IconSearch } from "./icons"
import { loader } from '@/routes/_index'

export default function RecentQueries() {
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
