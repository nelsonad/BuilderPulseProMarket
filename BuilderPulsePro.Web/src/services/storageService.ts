const authTokenKey = 'bpp.authToken'
const authRedirectKey = 'bpp.authRedirect'
const userModeKey = 'bpp.userMode'

type UserMode = 'client' | 'contractor'

export const getAuthToken = () => localStorage.getItem(authTokenKey)

export const setAuthToken = (token: string) => {
  localStorage.setItem(authTokenKey, token)
}

export const clearAuthToken = () => {
  localStorage.removeItem(authTokenKey)
}

export const getAuthRedirect = () => localStorage.getItem(authRedirectKey)

export const setAuthRedirect = (path: string) => {
  localStorage.setItem(authRedirectKey, path)
}

export const clearAuthRedirect = () => {
  localStorage.removeItem(authRedirectKey)
}

export const getUserMode = () => {
  const value = localStorage.getItem(userModeKey)
  return value === 'client' || value === 'contractor' ? value : null
}

export const setUserMode = (mode: UserMode) => {
  localStorage.setItem(userModeKey, mode)
}
