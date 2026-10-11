const offlinePracticeSlugs = new Set(['reaction-test', 'number-rush', 'memory-match'])
const offlinePublicPaths = new Set(['/', '/login', '/register', '/offline'])

export function resolveOfflineNavigation(pathname, isOnline) {
  if (isOnline || offlinePublicPaths.has(pathname) || pathname.startsWith('/offline-play/')) {
    return { type: 'allow' }
  }

  const gameSlug = pathname.match(/^\/games\/([^/]+)$/)?.[1]
  if (gameSlug && offlinePracticeSlugs.has(gameSlug)) {
    return { type: 'practice', slug: gameSlug }
  }

  return { type: 'fallback' }
}
