import { z } from 'zod';

export const passwordPolicySchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .refine((value) => /[A-Za-z]/.test(value), 'Password must include at least one letter.')
  .refine((value) => /[^A-Za-z]/.test(value), 'Password must include at least one non-letter.');

export const registerRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(1).max(120),
  password: passwordPolicySchema,
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});
