import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

test('global styles preserve a visible keyboard focus indicator', () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)\s*!important/s)
})

test('global styles respect reduced-motion preferences', () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(css, /transition-duration:\s*0\.01ms\s*!important/)
  assert.match(css, /animation-duration:\s*0\.01ms\s*!important/)
})
