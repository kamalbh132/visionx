"use client"

import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Props = {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export default function UserMenu({ user }: Props) {
  const firstLetter = user.name?.charAt(0).toUpperCase() ?? "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
          {firstLetter}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
            <span className="text-xs text-primary font-semibold">
              {user.role}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
