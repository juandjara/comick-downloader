export async function getJSON(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return json
}
