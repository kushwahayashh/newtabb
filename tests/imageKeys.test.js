import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveImageKey } from '../src/imageKeys.js'

const files = {
  '../images/gojo-glitch.webp': '/assets/gojo-glitch-a1b2.webp',
  '../images/mesh-red-gradient.webp': '/assets/mesh-red-gradient-c3d4.webp',
}

test('old JPG and PNG selections resolve to the optimized defaults', () => {
  assert.equal(resolveImageKey('../images/gojo-glitch.jpg', files), '../images/gojo-glitch.webp')
  assert.equal(resolveImageKey('../images/mesh-red-gradient.png', files), '../images/mesh-red-gradient.webp')
})

test('saved default IDs remain valid across asset hash changes', () => {
  const saved = resolveImageKey('/assets/gojo-glitch-a1b2.webp', files)
  const rebuilt = { '../images/gojo-glitch.webp': '/assets/gojo-glitch-new-hash.webp' }
  assert.equal(rebuilt[resolveImageKey(saved, rebuilt)], '/assets/gojo-glitch-new-hash.webp')
})

test('hidden defaults keep their identity after conversion', () => {
  const hidden = ['../images/mesh-red-gradient.png'].map((id) => resolveImageKey(id, files))
  const visible = Object.values(files).filter((src) => !hidden.includes(resolveImageKey(src, files)))
  assert.deepEqual(visible, ['/assets/gojo-glitch-a1b2.webp'])
})

test('uploads, empty selections, and missing defaults are preserved', () => {
  for (const id of ['upload:personal-photo', null, '../images/missing.jpg']) {
    assert.equal(resolveImageKey(id, files), id)
  }
})
