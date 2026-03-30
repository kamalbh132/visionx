-- Create TaskStatus enum
CREATE TYPE "TaskStatus" AS ENUM (
  'TODO',
  'IN_PROGRESS',
  'REVIEW_SUPERADMIN',
  'REVIEW_USER',
  'COMPLETED'
);

-- Add status/deadline to Task
ALTER TABLE "Task"
ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
ADD COLUMN "deadline" TIMESTAMP(3);

-- Backfill status for existing rows
UPDATE "Task"
SET "status" = CASE WHEN "isCompleted" THEN 'COMPLETED' ELSE 'TODO' END;

-- Create Notification table
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for notification fetch
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
