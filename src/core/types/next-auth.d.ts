import { DefaultSession, DefaultUser } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      userId: string
      username: string | null
      role: string
      isVerified: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username?: string | null
    role?: string
    isVerified?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string
    username: string | null
    role: string
    isVerified: boolean
  }
}