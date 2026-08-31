/**
 * Moving time from trackpoint timestamps, in minutes.
 *
 * Returns null rather than zero when the file has no usable timestamps. The
 * spec distinguishes a duration measured from a recorded track from one the
 * submitter estimated, and the caller can only make that distinction honestly
 * if this admits when it does not know.
 */
export function movingMinutes(
  timestamps: (string | null | undefined)[],
  { pauseThresholdMinutes = 10 }: { pauseThresholdMinutes?: number } = {},
): number | null {
  // Sorted, because some devices emit points out of order after losing signal.
  // Merely skipping the backwards gap is not enough: the interval it jumps over
  // then gets counted twice, producing more moving time than the track's own
  // elapsed span, which is impossible.
  const times = timestamps
    .filter((value): value is string => typeof value === 'string')
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)

  if (times.length < 2) return null

  let movingMs = 0
  const thresholdMs = pauseThresholdMinutes * 60_000

  for (let i = 1; i < times.length; i++) {
    const gap = times[i]! - times[i - 1]!
    // A gap over the threshold is a rest, not travel.
    if (gap <= thresholdMs) movingMs += gap
  }

  return movingMs / 60_000
}
