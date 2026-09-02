import type { City } from './types'

export type Region = 'north' | 'central' | 'south' | 'east' | 'islands'

/**
 * Counties grouped the way people actually say them.
 *
 * The filter panel listed counties while the site covered three of them. Now
 * that it covers Taiwan, twenty chips would be longer than the results they
 * filter, and nobody thinks in counties when choosing where to spend a
 * Saturday — they think north, east, the islands.
 *
 * Yilan sits in the north here, following the government's own grouping. It is
 * argued about; this file is where to change the answer if the argument is won.
 */
export const REGION_CITIES: Record<Region, City[]> = {
  north: ['taipei', 'newTaipei', 'keelung', 'taoyuan', 'hsinchuCity', 'hsinchuCounty', 'yilan'],
  central: ['miaoli', 'taichung', 'changhua', 'nantou', 'yunlin'],
  south: ['chiayiCity', 'chiayiCounty', 'tainan', 'kaohsiung', 'pingtung'],
  east: ['hualien', 'taitung'],
  islands: ['penghu'],
}

export const REGIONS = Object.keys(REGION_CITIES) as Region[]

const LOOKUP = new Map<City, Region>(
  REGIONS.flatMap((region) => REGION_CITIES[region].map((city) => [city, region] as const)),
)

export function regionOf(city: City): Region | null {
  return LOOKUP.get(city) ?? null
}
