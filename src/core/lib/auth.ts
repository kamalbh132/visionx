import NextAuth, { NextAuthOptions, User } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // ✅ Validation
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        // ✅ Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // ✅ Check if user exists
        if (!user) {
          throw new Error("No user found with this email")
        }

        // ✅ Check if user has password (not Google user)
        if (!user.password) {
          throw new Error("Please use Google Sign In for this account")
        }

        // ✅ Verify password
        const isValid = await compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error("Invalid password")
        }

        // ✅ Return user object (id is already string UUID)
        return {
          id: user.id,
          email: user.email,
          name: user.username || user.email.split('@')[0],
          username: user.username,
          role: user.role,
          isVerified: user.isVerified,
        }
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  callbacks: {
    async signIn({ user, account }) {
      try {
        if (!user.email) return false

        // ✅ Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        // ✅ Create new user if doesn't exist (Google sign-in)
        if (!existingUser && account?.provider === "google") {
          await prisma.user.create({
            data: {
              email: user.email,
              username: user.name || user.email.split('@')[0],
              password: undefined, // ✅ Use undefined, not null
              role: "CLIENT",
              isVerified: true, // ✅ Auto-verify Google users
            },
          })
        }

        return true
      } catch (error) {
        console.error("Sign in error:", error)
        return false
      }
    },

    async jwt({ token, user, trigger }) {
      // ✅ On sign in, add user data to token
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (dbUser) {
          token.userId = dbUser.id          // ✅ Changed from token.id
          token.username = dbUser.username
          token.role = dbUser.role
          token.isVerified = dbUser.isVerified
        }
      }

      return token
    },

    async session({ session, token }) {
      // ✅ Add token data to session
      if (session.user && token.userId) {
        // Fetch latest user data
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
        })

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.userId = dbUser.id
          session.user.username = dbUser.username
          session.user.role = dbUser.role
          session.user.isVerified = dbUser.isVerified
          session.user.email = dbUser.email
        }
      }

      return session
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
}