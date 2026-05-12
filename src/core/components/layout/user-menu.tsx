"use client"
import { signOut } from "next-auth/react"
import { LogOut, User as UserIcon, Shield } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar" // Assuming you have shadcn avatar, if not use div below

type Props = {
  user: {
    name?: string | null
    username?: string | null
    email?: string | null
    role?: string
    image?: string | null
  }
  collapsed?: boolean
}

export default function UserMenu({ user, collapsed }: Props) {
  // Logic to get initials: Username -> Name -> Email -> "U"
  const displayName = user.username || user.name || user.email?.split('@')[0] || "User";
  const firstLetter = displayName.charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-2 outline-none rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
          {/* Avatar Circle */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            {user.image ? (
               <img src={user.image} alt="avatar" className="h-full w-full rounded-full object-cover" />
            ) : (
               <span>{firstLetter}</span>
            )}
          </div>
          {/* Text Info (Only if sidebar is open) */}
          {!collapsed && (
             <div className="flex flex-col items-start text-sm">
                <span className="font-semibold text-slate-700 truncate max-w-30">{displayName}</span>
                <span className="text-xs text-slate-500 capitalize">{user.role?.toLowerCase()}</span>
             </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? "start" : "end"} className="w-56" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded text-xs text-primary font-semibold w-fit">
            <Shield size={10} />
            {user.role}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}