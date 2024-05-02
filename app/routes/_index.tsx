import Image from "@/components/Image"
import { BASE_URL } from "@/config"
import { getJSON } from "@/request"
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react"

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get("q")
  const url = `${BASE_URL}/v1.0/search?q=${q}`
  if (!q) {
    return {
      results: []
    }
  }

  const data = await getJSON(url)

  return {
    results: data
  }
}

export default function Index() {
  const [sp] = useSearchParams()
  const q = sp.get("q") || ''
  const { results } = useLoaderData<typeof loader>()
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
          />
        </div>
      </Form>
      {busy ? (
        <div className="text-center mt-4">Loading...</div>
      ) : (
        <ul className="mt-4 list-disc">
          {results.map((result) => (
            <li key={result.id} className="p-4 border-b my-2 flex items-start gap-2">
              <Image w={100} h={100} b2key={result.md_covers[0]?.b2key} />
              <Link to={`/comic/${result.hid}`} className="flex-grow text-lg font-semibold">{result.title}</Link>
              <a href={`https://comick.io/comic/${result.slug}`}>Link</a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
