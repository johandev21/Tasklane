export function getAuthRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/home'
  if (
    value.startsWith('//') ||
    [...value].some((character) => {
      const code = character.charCodeAt(0)
      return code <= 0x1f || code === 0x7f || /\s/.test(character)
    })
  )
    return '/home'
  const path = value.split(/[?#]/)[0]
  if (path === '/sign-in' || path === '/sign-up' || path === '/') return '/home'
  return value
}
