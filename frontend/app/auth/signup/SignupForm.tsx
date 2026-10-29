"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailField, PasswordField } from "@/components/auth/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { registerSchema } from "@/lib/auth/schemas";

export function SignupForm({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const { register } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    // Same schema the API enforces; checking here just gives instant feedback.
    const parsed = registerSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setPending(true);
    setError("");

    try {
      // The backend signs the new account in; AuthProvider then sends the user on to callbackUrl.
      await register(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start analyzing your codebase today"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`${AUTH_ROUTES.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-violet-400 transition-colors hover:text-violet-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <FormAlert tone="error">{error}</FormAlert>

      <form onSubmit={onSubmit} className="space-y-4">
        <EmailField label="Email" name="email" required placeholder="you@example.com" disabled={pending} />

        <div>
          <PasswordField
            label="Password"
            name="password"
            required
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
          <PasswordChecklist password={password} />
        </div>

        <div>
          <PasswordField
            label="Confirm password"
            name="confirm"
            required
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
            disabled={pending}
          />
          {mismatch && (
            <p role="alert" className="mt-1.5 text-xs text-red-400">
              Passwords do not match.
            </p>
          )}
        </div>

        <SubmitButton pending={pending} pendingLabel="Creating account...">
          Create account
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
