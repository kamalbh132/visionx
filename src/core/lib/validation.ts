// Central Zod schemas for all API input validation

import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  description: z.string().max(500, "Description too long").optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").trim(),
  description: z.string().max(2000, "Description too long").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  projectId: z.string().uuid("Invalid project ID"),
  assignedToId: z.string().uuid("Invalid user ID").optional(),
  deadline: z.string().min(1, "Deadline is required"),
  isCritical: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW_SUPERADMIN", "COMPLETED"]).optional(),
  deadline: z.string().optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string().max(5000, "Message too long").optional(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "PDF", "FILE", "VOICE"]).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().max(52_428_800).optional(),
  mimeType: z.string().max(100).optional(),
  replyToId: z.string().uuid().optional().nullable(),
});

export const createConversationSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]),
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().uuid()).min(1, "At least one member required"),
});

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join(", ");
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}
