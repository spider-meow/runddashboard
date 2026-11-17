"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

// Bouton d'envoi : désactivé et annoncé comme occupé pendant l'action, pour qu'un double clic n'envoie pas deux fois.
export function SubmitButton({ children, pendingLabel = "Enregistrement…", tone = "primary" }: { children: ReactNode; pendingLabel?: string; tone?: "primary" | "plain" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn${tone === "plain" ? "" : ` ${tone}`}`} type="submit" disabled={pending} aria-busy={pending}>
      {pending && <span className="spin" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

// Champ de formulaire : libellé, aide et erreur reliés au champ (aria-describedby), erreur signalée par aria-invalid.
export function Field({ name, label, hint, error, defaultValue = "", type = "text", inputMode, placeholder, required, rows, accept }: {
  name: string; label: string; hint?: string; error?: string; defaultValue?: string; type?: string; inputMode?: "text" | "decimal" | "numeric";
  placeholder?: string; required?: boolean; rows?: number; accept?: string;
}) {
  const id = useId(), descId = `${id}-d`;
  const common = { id, name, required, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? descId : undefined, autoComplete: "off" as const };
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {rows ? <textarea {...common} rows={rows} defaultValue={defaultValue} /> : type === "file" ? <input {...common} type="file" accept={accept} /> : <input {...common} type={type} inputMode={inputMode} placeholder={placeholder} defaultValue={defaultValue} />}
      <p id={descId} className={error ? "err" : "hint"}>{error ?? hint}</p>
    </div>
  );
}

// Message d'un formulaire. Le conteneur existe toujours : c'est ce qui permet aux lecteurs d'écran d'annoncer le message quand il apparaît.
export function FormMessage({ state }: { state: FormState }) {
  const cls = state.status === "ok" ? "ok" : state.status === "warn" ? "notice" : state.status === "error" ? "alert" : "";
  return (
    <div className="form-msg" aria-live="polite" aria-atomic="true">
      {state.message && <p className={`${cls} pop`}>{state.message}{state.href && <> <a className="inline-link" href={state.href}>Voir</a></>}</p>}
    </div>
  );
}

// Après une erreur de validation, le focus va au premier champ fautif : le clavier et les agents arrivent directement dessus.
export function useFocusFirstError(form: RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    // Après le rendu ET la réinitialisation du formulaire par React (qui suit la fin de l'action).
    const id = setTimeout(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 50);
    return () => clearTimeout(id);
  }, [state, form]);
}

// Message ponctuel après une redirection (« course créée »). Le paramètre d'adresse est lu au premier rendu puis retiré : le message reste
// affiché (état local) mais un rechargement ou un lien partagé ne le rejoue pas. À rendre toujours, c'est le composant qui décide d'afficher.
export function Flash({ param, children }: { param: string; children: ReactNode }) {
  const params = useSearchParams(), router = useRouter(), pathname = usePathname();
  const [shown] = useState(() => params.has(param));
  useEffect(() => { if (params.has(param)) router.replace(pathname, { scroll: false }); }, [params, param, router, pathname]);
  return <div aria-live="polite">{shown && <p className="ok pop">{children}</p>}</div>;
}
