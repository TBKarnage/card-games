export const HUB_HOSTNAME = 'games.burks.pro'
export const HUB_URL = 'https://games.burks.pro/'

function isReferrerFromHubRoot(referrer: string): boolean {
  if (!referrer) return false
  try {
    const url = new URL(referrer)
    return url.hostname === HUB_HOSTNAME && url.pathname === '/'
  } catch {
    return false
  }
}

export function navigateToGamesHub(): void {
  const isOnHubHost =
    typeof window !== 'undefined' && window.location.hostname === HUB_HOSTNAME

  if (isOnHubHost) {
    const fromHubRoot =
      typeof document !== 'undefined' && isReferrerFromHubRoot(document.referrer)

    if (fromHubRoot && window.history.length > 1) {
      const docWithTransition = document as Document & {
        startViewTransition?: (callback: () => void) => unknown
      }
      if (typeof docWithTransition.startViewTransition === 'function') {
        docWithTransition.startViewTransition(() => {
          window.history.back()
        })
      } else {
        window.history.back()
      }
      return
    }

    window.location.assign('/')
    return
  }

  window.location.assign(HUB_URL)
}
