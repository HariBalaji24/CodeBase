import { z } from "zod";

// Shared by the signup form (live feedback) and the register API (enforcement),
// so the two can never disagree about what a valid password is.
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .refine((p) => PASSWORD_RULES.every((rule) => rule.test(p)), {
    message: "Password must be 8+ characters with an uppercase letter, a lowercase letter and a number.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
