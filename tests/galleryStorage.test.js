import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGallery } from '../src/galleryStorage.js'
import { resolveImageKey } from '../src/imageKeys.js'

const photo = { id: 'upload:photo', src: 'data:image/png;base64,cGhvdG8=', name: 'photo.png' }

test('missing or malformed collections restore to an empty gallery', () => {
  for (const value of [undefined, null, {}, { uploads: 'broken', hidden: {} }]) {
    assert.deepEqual(normalizeGallery(value), { uploads: [], hidden: [] })
  }
})

test('invalid records and duplicate IDs do not enter the saved collection', () => {
  const uploads = [null, {}, { ...photo, src: 'https://example.com/image.png' }, photo, photo, { ...photo, id: 'default:photo' }]
  assert.deepEqual(normalizeGallery({ uploads }).uploads, [photo])
})

test('hidden defaults migrate to WebP and are deduplicated', () => {
  const files = { '../images/default.webp': '/assets/default-hash.webp' }
  const saved = { hidden: [null, 3, '../images/default.png', '../images/default.webp'] }
  assert.deepEqual(normalizeGallery(saved, (id) => resolveImageKey(id, files)).hidden, ['../images/default.webp'])
})

test('normalizing a collection leaves the original record intact', () => {
  const saved = Object.freeze({ uploads: Object.freeze([Object.freeze(photo)]), hidden: Object.freeze(['../images/default.webp']) })
  assert.deepEqual(normalizeGallery(saved), saved)
})
