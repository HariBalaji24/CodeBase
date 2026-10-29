import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/auth/schemas";

// Live checklist of the same rules the register API enforces.
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              met ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            {met ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
            {rule.label}
            <span className="sr-only">{met ? " (met)" : " (not met yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
