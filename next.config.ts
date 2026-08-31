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
const nextConfig: NextConfig = {}

export default createNextIntlPlugin()(nextConfig)
