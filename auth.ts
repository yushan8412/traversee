import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { userIdFromSubject } from './lib/auth/identity'
import { parseAdminAllowlist, resolveRole } from './lib/auth/roles'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'user' | 'admin'
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],

  // JWT rather than a database session. Static Web Apps runs the app as a
  // managed function with no shared session store, and a per-request database
  // read to validate a session would spend the fixed 1,000 RU/s budget on
  // something a signed token already proves.
  session: { strategy: 'jwt' },

  callbacks: {
    jwt({ token, profile }) {
      // profile is present only on the sign-in pass; later calls just carry the
      // token forward.
      if (profile?.sub) {
        token.userId = userIdFromSubject(profile.sub)
        // The role is decided here, from the allowlist, rather than read back
        // from the database. An administrator removed from the allowlist keeps
        // their role until the token expires, which is the trade for not paying
        // a database read on every request — worth revisiting if the admin set
        // ever becomes something that changes often.
        token.role = resolveRole(profile.email, parseAdminAllowlist(process.env.ADMIN_EMAILS))
      }
      return token
    },

    session({ session, token }) {
      session.user.id = (token.userId as string) ?? ''
      // Anything other than an explicit admin is a user. A missing or malformed
      // claim must not fall through to the privileged branch.
      session.user.role = token.role === 'admin' ? 'admin' : 'user'
      return session
    },
  },
})
