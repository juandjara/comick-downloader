import { parseHTML } from 'linkedom'

export async function getJSON<T>(url: string) {
  // const res = await fetch(url)
  // if (!res.ok) {
  //   throw new Error(`Request to ${url} failed with status ${res.status} ${res.statusText}\n${await res.text()}`)
  // }

  // const json = await res.json()
  // return json as T
  const json = await flaresolverrGet(url)
  return json as T
}

export async function tryGetJSON<T, T2 = T>(initialData: T2, url: string) {
  try {
    const data = await getJSON<T>(url)
    return wrapData(data)
  } catch (error) {
    console.error(error)
    return wrapData(initialData, error)
  }
}

export function wrapData<T, E>(data: T, error?: E) {
  return { data, error }
}

async function flaresolverrGet(url: string) {
  const flaresolverrUrl = process.env.FLARESOLVERR_URL
  if (!flaresolverrUrl) {
    throw new Error('FLARESOLVERR_URL is not set')
  }

  const res = await fetch(`${flaresolverrUrl}/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      cmd: 'request.get',
      url,
      maxTimeout: 10000, // 10 seconds
    })
  })
  if (!res.ok) {
    throw new Error(`Request to ${url} (and flaresolverr) failed with status ${res.status} ${res.statusText}\n${await res.text()}`)
  }

  const jsonRes = await res.json()
  const html = jsonRes.solution?.response as string
  const { document } = parseHTML(html)
  const json = document.querySelector('pre')?.textContent
  if (!json) {
    throw new Error('No JSON found in the HTML response')
  }

  return JSON.parse(json)
}