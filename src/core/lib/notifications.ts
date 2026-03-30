import prisma from "@/core/lib/prisma"

type NotificationInput = {
  userIds: string[]
  title: string
  message?: string
  actorId?: string
}

export async function createNotifications({
  userIds,
  title,
  message,
  actorId,
}: NotificationInput) {
  const uniqueIds = Array.from(
    new Set(userIds.filter((id) => id && id !== actorId))
  )
  if (uniqueIds.length === 0) return

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      title,
      message,
    })),
  })
}
