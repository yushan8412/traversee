import type { RouteMetrics } from './types'

/**
 * The numbers a place carries, in one line.
 *
 * A spot gets nothing. It used to get the word for its own kind — "地點" — which
 * says less than the line above it, where the county and the activities already
 * are, and less than the pin on the map, which carries the activity icon.
 *
 * This expression existed three times: the home page's rail, the index card and
 * the explore pin. All three said "地點" under a photograph of a hot spring.
 */
export function placeMetrics(
  route: Pick<RouteMetrics, 'distanceKm' | 'elevationGainM'> | null | undefined,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (!route) return ''
  return `${t('metrics.kilometres', { value: route.distanceKm })} · ↑${t('metrics.metres', { value: route.elevationGainM })}`
}
