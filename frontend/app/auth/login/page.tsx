import { safeCallbackUrl } from "@/lib/auth/routes";
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl } = await searchParams;

  return <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
