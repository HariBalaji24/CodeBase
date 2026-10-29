import { safeCallbackUrl } from "@/lib/auth/routes";
import { SignupForm } from "./SignupForm";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl } = await searchParams;

  return <SignupForm callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
