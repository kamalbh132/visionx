import NextAuth, { NextAuthOptions } from "next-auth"
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isValid = await compare(credentials.password, user.password)
        if (!isValid) throw new Error("Invalid password")

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isVerified: user.isVerified,
        }
      },
    }),
  ],
  callbacks: {
    // ADDED: Logic to handle Google User creation and auto-verification
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Sanitize Google display name — remove spaces/special chars, ensure uniqueness
            const baseUsername = (user.name ?? user.email!.split("@")[0])
              .replace(/[^a-zA-Z0-9_]/g, "")
              .slice(0, 25) || "user";
            const suffix = Math.random().toString(36).slice(2, 7);
            const username = `${baseUsername}_${suffix}`;

            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                username,
                role: "USER",
                isVerified: true,
              },
            });
            // Attach data to the user object for the JWT callback
            user.id = newUser.id;
            user.role = newUser.role;
            user.isVerified = newUser.isVerified;
          } else {
            // Ensure existing user data is passed to token
            user.id = existingUser.id;
            user.role = existingUser.role;
            user.isVerified = existingUser.isVerified;
          }
        } catch (error) {
          console.error("Error during Google sign in:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      // Initial Login (Captures Google info or Credentials info)
      if (user) {
        token.id = user.id;
        token.userId = user.id;
        token.role = user.role as string;
        token.isVerified = user.isVerified as boolean;
        token.username = (user.username as string) || (user.name as string) || null;
      }

      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        });
        if (dbUser) {
          token.isVerified = dbUser.isVerified;
          token.role = dbUser.role;
          token.username = dbUser.username;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.userId = token.userId as string;
        session.user.username = token.username as string | null;
        session.user.role = token.role as string;
        session.user.isVerified = token.isVerified as boolean;
        session.isVerified = token.isVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions);