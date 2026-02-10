const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalized}`
}

const buildError = async (response: Response) => {
  const text = await response.text()
  return text || `Request failed (${response.status})`
}

export const requestJson = async <T>(path: string, options?: RequestInit) => {
  const response = await fetch(buildUrl(path), options)

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const requestEmpty = async (path: string, options?: RequestInit) => {
  const response = await fetch(buildUrl(path), options)

  if (!response.ok) {
    throw new Error(await buildError(response))
  }
}
