"use client";

import { useActionState } from "react";
import { IDLE, type FormState } from "@/lib/forms";
import { Field, FormMessage, SubmitButton } from "./formkit";

// Import d'un fichier .gpx / .fit. Le résultat (ce qui a été lu, ou pourquoi ça a échoué) s'affiche sur place.
export function FileForm({ action, label, hint, submit, pending }: { action: (prev: FormState, formData: FormData) => Promise<FormState>; label: string; hint: string; submit: string; pending: string }) {
  const [state, formAction] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="stackform">
      <Field name="file" label={label} type="file" accept=".gpx,.fit" required hint={hint} />
      <FormMessage state={state} />
      <div><SubmitButton tone="plain" pendingLabel={pending}>{submit}</SubmitButton></div>
    </form>
  );
}
