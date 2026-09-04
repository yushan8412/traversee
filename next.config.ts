import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

// Deliberately near-empty for M0. Static Web Apps' hybrid Next.js support is in
// preview, so the deployment is validated with the fewest moving parts possible;
// anything added here is another variable if the first deploy fails.
//
// Two levers we know about but have not pulled yet:
//   output: 'standalone'  — cuts bundle size against the Free plan's 250 MB app
//                           cap. Not needed at this size, and it changes what the
//                           build emits, so it stays off until M2 when the app is
//                           big enough for the cap to be a real question.
//   Route rewrites        — must live here rather than in staticwebapp.config.json,
//                           which does not support rewrites into a Next.js app.
const nextConfig: NextConfig = {
  // Turned on 2026-09-04, after production spent twelve hours refusing to warm
  // up. The comment above reserved this lever for the Free plan's 250 MB app
  // cap; a production dependency install measures 506 MB on its own, before the
  // build output. Standalone ships only what the node file traces say each
  // route needs, which is what the cap is actually about.
  output: 'standalone',
  experimental: {
    serverActions: {
      // Server actions default to a 1 MB body, which is smaller than a single
      // phone photo — uploads failed with a 413 before reaching any of our code.
      //
      // 32 MB covers six photos at the per-file cap. It is a real ceiling rather
      // than a generous one: the whole body is held in memory by the function
      // while it is processed, and this runs on the Free plan. If submissions
      // ever need to be larger, the answer is uploading straight to blob storage
      // with a short-lived SAS rather than raising this again.
      bodySizeLimit: '32mb',
    },
  },
}

export default createNextIntlPlugin()(nextConfig)
