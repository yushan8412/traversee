import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // `api` must stay excluded. /api/render-check is what the deploy workflow
  // probes to prove server-side rendering, and locale middleware would redirect
  // it to /zh/api/render-check — breaking the deployment gate rather than the
  // page, which is a much harder failure to read.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
