import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { resolveOfflineNavigation } from '../src/pwa/offlineNavigation.js'
import { assertOnlineForScoreSubmission } from '../src/pwa/scoreSubmission.js'

const distUrl = new URL('../dist/', import.meta.url)

test('production manifest declares an installable standalone app and valid icon files', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', distUrl), 'utf8'))
  assert.equal(manifest.name, 'GameHub')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.theme_color, '#111323')
  assert.equal(manifest.background_color, '#111323')

  for (const icon of manifest.icons) {
    const data = await readFile(new URL(icon.src.slice(1), distUrl))
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a')
    const declaredSize = Number(icon.sizes.split('x')[0])
    assert.equal(data.readUInt32BE(16), declaredSize)
    assert.equal(data.readUInt32BE(20), declaredSize)
  }
})

test('generated worker precaches build assets, excludes API routes, and updates stale caches', async () => {
  const worker = await readFile(new URL('sw.js', distUrl), 'utf8')
  const precacheUrls = [...worker.matchAll(/url:"([^"]+)"/g)].map((match) => match[1])

  assert.ok(precacheUrls.includes('index.html'))
  assert.ok(precacheUrls.some((url) => url.startsWith('assets/ReactionTest-')))
  assert.ok(precacheUrls.some((url) => url.startsWith('assets/NumberRush-')))
  assert.ok(precacheUrls.some((url) => url.startsWith('assets/MemoryMatch-')))
  assert.ok(precacheUrls.every((url) => !url.startsWith('/api') && !url.includes('/api/')))
  assert.match(worker, /denylist:\[\/\^\\\/api/)
  assert.match(worker, /skipWaiting\(\)/)
  assert.match(worker, /cleanupOutdatedCaches\(\)/)
  assert.doesNotMatch(worker, /NetworkFirst|CacheFirst|StaleWhileRevalidate/)
})

test('offline navigation only exposes practice and public shell routes', () => {
  assert.deepEqual(resolveOfflineNavigation('/dashboard', false), { type: 'fallback' })
  assert.deepEqual(resolveOfflineNavigation('/friends', false), { type: 'fallback' })
  assert.deepEqual(resolveOfflineNavigation('/chess', false), { type: 'fallback' })
  assert.deepEqual(resolveOfflineNavigation('/games/reaction-test', false), { type: 'practice', slug: 'reaction-test' })
  assert.deepEqual(resolveOfflineNavigation('/games/unknown', false), { type: 'fallback' })
  assert.deepEqual(resolveOfflineNavigation('/offline-play/memory-match', false), { type: 'allow' })
  assert.deepEqual(resolveOfflineNavigation('/', false), { type: 'allow' })
  assert.deepEqual(resolveOfflineNavigation('/dashboard', true), { type: 'allow' })
})

test('offline score submission guard rejects the attempt', () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } })

  try {
    assert.throws(assertOnlineForScoreSubmission, /offline.*skor belum tersimpan/i)
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
  }
})
