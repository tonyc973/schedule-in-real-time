import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "./enums";

// The placeholder shipped in the committed dev .env. JWT sessions are signed with
// this secret and embed the user's id + role, so a known secret in production would
// let anyone forge a session for any user. Fail fast rather than silently using it.
const DEV_PLACEHOLDER_SECRET = "dev-secret-change-me-in-production-please-0123456789";
const secret = process.env.NEXTAUTH_SECRET;
// Enforce at runtime only — `next build` imports this module with
// NODE_ENV=production to collect page data, but no secret is needed then.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (
  process.env.NODE_ENV === "production" &&
  !isBuildPhase &&
  (!secret || secret === DEV_PLACEHOLDER_SECRET)
) {
  throw new Error(
    "NEXTAUTH_SECRET must be a strong, non-placeholder value in production. " +
      "Generate one with `openssl rand -base64 32` and inject it via the environment.",
  );
}

// NextAuth credentials auth. Browsing is anonymous; a session is only required
// at the booking confirm step and on the appointments dashboard.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parolă", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "CLIENT";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  secret,
};
