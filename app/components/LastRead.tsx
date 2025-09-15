import { Form, Link, useLoaderData, useNavigation } from '@remix-run/react'
import { loader } from '@/routes/_index'
import { IconClose } from './icons'
import { useMemo } from 'react'

export default function LastRead() {
  const { lastRead } = useLoaderData<typeof loader>()
  const { state } = useNavigation()
  const busy = state !== 'idle'
  const folders = useMemo(() => {
    const values = {} as Record<string, string[]>
    for (const file of lastRead) {
      const folder = file.split('/')[1]
      if (!values[folder]) {
        values[folder] = []
      }
      values[folder].push(file)
    }
    return Object.entries(values).map(([key, value]) => ({
      folder: key,
      items: value
    }))
  }, [lastRead])

  if (!lastRead?.length) {
    return null
  }

  return (
    <div className="mt-8">
      <div className="px-3 mb-2 flex items-center">
        <h2 className="flex-grow text-xl font-medium">Last read</h2>
        <Form className="inline" method="POST">
          <button
            className="flex items-center gap-2 px-2 py-1 border rounded-md hover:bg-gray-50 transition-colors"
            type="submit"
            name="_action"
            value="clear-lastread"
            disabled={busy}
          >
            <IconClose />
            <p>Clear</p>
          </button>
        </Form>
      </div>
      {folders.map(({ folder, items }) => (
        <details open key={folder} className='px-3 py-2'>
          <summary className='text-lg mb-2'>{folder}</summary>
          <ul className="divide-y px-1">
            {items.map((f) => (
              <li
                key={f}
                className="flex items-stretch gap-2 hover:bg-gray-100 transition-colors"
              >
                <Link
                  className="block w-full p-3"
                  to={`/read?file=${encodeURIComponent(f)}`}
                >
                  {f.split('/').pop()}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
