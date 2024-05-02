import Image from '@/components/Image'
import { BASE_URL } from '@/config'
import { getJSON } from '@/request'
import { LoaderFunctionArgs } from '@remix-run/node'
import { Form, useLoaderData, useNavigation, useSubmit } from '@remix-run/react'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const headerLang = request.headers.get('Accept-Language') || ''
  const headerLangPart = headerLang.split(',')[0].split('-')[0]
  const spLang = new URL(request.url).searchParams.get('lang')
  const lang = spLang || headerLangPart || 'en'
  const id = params.id

  const [comic, chapters] = await Promise.all([
    getJSON(`${BASE_URL}/comic/${id}`),
    getJSON(`${BASE_URL}/comic/${id}/chapters?lang=${lang}`)
      .then((res) => res.chapters),
  ])
  return { comic, chapters, lang }
}

export default function Comic() {
  const { comic, chapters, lang } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  console.log(comic)

  return (
    <main className='max-w-screen-lg mx-auto p-4'>
      <header className='flex flex-col md:flex-row gap-3 items-start'>
        <Image w={200} h={200} b2key={comic.comic.md_covers[0]?.b2key} />
        <div className='max-w-prose'>
          <h3 className='text-2xl font-semibold'>
            {comic.comic.title} <span className='text-sm font-normal'>({comic.comic.year})</span>
          </h3>
          <p className='text-sm font-normal mb-1'>{comic.authors.map((a) => a.name).join(', ')}</p>
          <p className='text-sm font-normal mb-3'>{comic.demographic}</p>
          <p dangerouslySetInnerHTML={{ __html: comic.comic.parsed }}></p>
          <ul className='flex flex-wrap gap-1 my-3 text-xs'>
            {comic.comic.md_comic_md_genres.map((g) => (
              <li className='bg-gray-200 rounded-md px-1 py-0.5' key={g.md_genres.slug}>{g.md_genres.name}</li>
            ))}
          </ul>
          <Form onChange={(ev) => submit(ev.currentTarget)} className='py-4'>
            <label className='mr-2' htmlFor='lang'>Language</label>
            <select
              id='lang'
              name='lang'
              value={lang}
              className='px-2 py-1 rounded-md'
            >
              {comic.langList.map((l: string) => (
                <option key={l} value={l} selected={l === lang}>
                  {l}
                </option>
              ))}
            </select>
          </Form>
          {busy && <p className='p-3'>Loading...</p>}
          <ul className='mt-2 mb-4'>
            {chapters.map((c) => (
              <li key={c.id} className='relative p-2 border-b hover:bg-gray-100'>
                <a
                  className='absolute inset-0 opacity-0'
                  href={`/comic/${comic.comic.id}/chapter/${c.id}`}
                >{c.title}</a>
                <div className='flex items-center gap-2'>
                  <p className='flex-grow'>
                    <strong className='font-medium'>Ch. {c.chap}</strong>
                    <span className='ml-2 font-light'>{c.title}</span>
                  </p>
                  {c.vol && (<p>Vol {c.vol}</p>)}
                </div>
                <div className='flex items-center gap-2'>
                  <p className='flex-grow'>
                    <small>{c.group_name.join(', ')}</small>
                  </p>
                  <p>
                    <small>{new Date(c.updated_at).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' })}</small>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </header>
    </main>
  )
}
