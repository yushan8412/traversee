import type { Photo } from './types'

/**
 * Stand-in photography for the catalogue, from Wikimedia Commons.
 *
 * These are photographs of the actual places, not generic outdoor stock —
 * a picture of a different waterfall filed under this one would be exactly
 * the kind of plausible falsehood this site exists to avoid. Where Commons
 * had only one usable image of a place, that place gets one.
 *
 * They are somebody else's work under CC licences, so every one carries its
 * author and licence, and the card prints that credit on the picture. They
 * are used only where a place has no photograph of its own, and they go away
 * on their own as real ones arrive. Full attribution and source links are in
 * public/places/PROVENANCE.md.
 */
export interface StandInPhoto extends Pick<Photo, 'path'> {
  credit: string
}

export const standInPhotos: Record<string, StandInPhoto[]> = {
  'lengshuikeng-loop': [
    { path: '/places/lengshuikeng-loop/1.webp', credit: "Syced / CC0" },
    { path: '/places/lengshuikeng-loop/2.webp', credit: "羅源森 / CC BY-SA 4.0" },
  ],
  'old-caoling-circular': [
    { path: '/places/old-caoling-circular/1.webp', credit: "陳銘宏 / CC BY-SA 4.0" },
    { path: '/places/old-caoling-circular/2.webp', credit: "lienyuan lee / CC BY 3.0" },
  ],
  'fulong-beach': [
    { path: '/places/fulong-beach/1.webp', credit: "Allervous / CC BY-SA 4.0" },
    { path: '/places/fulong-beach/2.webp', credit: "Любарский Сергей Николаевич / CC BY-SA 4.0" },
  ],
  'wanggu-waterfall': [
    { path: '/places/wanggu-waterfall/1.webp', credit: "Devey Chiou / CC BY-SA 4.0" },
  ],
  'wangyou-valley': [
    { path: '/places/wangyou-valley/1.webp', credit: "Taiwankengo / CC BY-SA 4.0" },
    { path: '/places/wangyou-valley/2.webp', credit: "lienyuan lee / CC BY 3.0" },
  ],
  'taipei-loop': [
    { path: '/places/taipei-loop/1.webp', credit: "玄史生 / CC BY-SA 3.0" },
    { path: '/places/taipei-loop/2.webp', credit: "C.L. Kao (eddie5150) / CC BY-SA 3.0" },
  ],
  'mt-datun-navigation-station-1': [
    { path: '/places/mt-datun-navigation-station-1/1.webp', credit: "Ianbu / CC BY-SA 4.0" },
    { path: '/places/mt-datun-navigation-station-1/2.webp', credit: "MiNe / CC BY 2.0" },
  ],
}
