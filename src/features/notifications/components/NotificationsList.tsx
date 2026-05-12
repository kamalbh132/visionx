"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"
import { formatDistanceToNow } from "date-fns"

type NotificationItem = {
  id: string
  title: string
  message: string | null
  isRead: boolean
  createdAt: string | Date
}

export function NotificationsList({
  title,
  initialNotifications,
}: {
  title: string
  initialNotifications: NotificationItem[]
}) {
  const [items, setItems] = useState(initialNotifications)
  const [marking, setMarking] = useState(false)

  const markAllRead = async () => {
    setMarking(true)
    try {
      const res = await fetch("/api/*  *//v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      toast.error("Failed to mark notifications")
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <Button variant="outline" onClick={markAllRead} disabled={marking}>
          Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border rounded-xl bg-slate-50/60 p-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => (
            <Card key={notification.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {notification.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notification.message && (
                  <p className="text-sm text-slate-600">
                    {notification.message}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      notification.isRead
                        ? "bg-slate-100 text-slate-500"
                        : "bg-blue-50 text-blue-700"
                    )}
                  >
                    {notification.isRead ? "Read" : "New"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
