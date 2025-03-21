export async function getJSON<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status} ${res.statusText}\n${await res.text()}`)
  }

  const json = await res.json()
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
