"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailField, PasswordField } from "@/components/auth/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuth } from "@/components/auth/AuthProvider";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export function LoginForm({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    setError("");

    try {
      // On success AuthProvider sends the user on to callbackUrl (same-site paths only).
      await login({
        email: String(form.get("email") ?? "").trim().toLowerCase(),
        password: String(form.get("password") ?? ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            href={`${AUTH_ROUTES.signup}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-violet-400 transition-colors hover:text-violet-300"
          >
            Sign up
          </Link>
        </>
      }
    >
      <FormAlert tone="error">{error}</FormAlert>

      <form onSubmit={onSubmit} className="space-y-4">
        <EmailField label="Email" name="email" required placeholder="you@example.com" disabled={pending} />
        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={pending}
        />
        <SubmitButton pending={pending} pendingLabel="Signing in...">
          Sign in
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
