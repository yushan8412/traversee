import { describe, expect, it } from 'vitest'
import { acceptPhotos, attachPhotos } from './selection'

function photo(name: string, size = 1000, lastModified = 1): File {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg', lastModified })
}

describe('acceptPhotos', () => {
  it('keeps what was already chosen and adds what is new', () => {
    const chosen = acceptPhotos([photo('a.jpg')], [photo('b.jpg')], 6)
    expect(chosen.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('stops at the limit rather than silently dropping the earlier choices', () => {
    const current = [photo('a.jpg'), photo('b.jpg')]
    const chosen = acceptPhotos(current, [photo('c.jpg'), photo('d.jpg')], 3)
    expect(chosen.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
  })

  it('ignores a photo that is already chosen', () => {
    // The picker cannot be pre-filled with a previous selection, so re-opening
    // it to add a second photo means picking the first one again. Without this
    // the same image is submitted twice.
    const chosen = acceptPhotos([photo('a.jpg', 1000, 5)], [photo('a.jpg', 1000, 5)], 6)
    expect(chosen).toHaveLength(1)
  })

  it('treats two different photos with the same name as different', () => {
    const chosen = acceptPhotos([photo('IMG_0001.jpg', 1000, 5)], [photo('IMG_0001.jpg', 2000, 9)], 6)
    expect(chosen).toHaveLength(2)
  })
})

describe('attachPhotos', () => {
  it('sends the photos that are on screen, not the ones the input still holds', () => {
    // The file input keeps whatever was picked last, including a photo that has
    // since been removed from the grid. Whatever it carried has to go.
    const form = new FormData()
    form.append('photos', photo('removed.jpg'))
    form.append('nameZh', '大屯山')

    const sent = attachPhotos(form, [photo('kept.jpg')])

    expect(sent.getAll('photos').map((f) => (f as File).name)).toEqual(['kept.jpg'])
    expect(sent.get('nameZh')).toBe('大屯山')
  })

  it('leaves no empty photo field behind when none were chosen', () => {
    // An empty File entry would reach the server as a zero-byte upload.
    const form = new FormData()
    form.append('photos', new File([], ''))
    expect(attachPhotos(form, []).getAll('photos')).toEqual([])
  })
})
