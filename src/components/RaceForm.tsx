"use client";

import { useActionState, useRef, useState } from "react";
import { IDLE, type FormState } from "@/lib/forms";
import { Field, FormMessage, SubmitButton, useFocusFirstError } from "./formkit";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
export type RaceValues = Record<"name" | "date" | "distance_km" | "dplus" | "pace" | "checkpoints" | "notes", string>;

// Formulaire de course, pour la création (champs de base) comme pour la modification (repères et notes en plus).
// Les valeurs saisies reviennent avec l'état : une erreur ne vide jamais le formulaire.
export function RaceForm({ action, initial, mode }: { action: Action; initial: Partial<RaceValues>; mode: "create" | "edit" }) {
  const [state, formAction] = useActionState(action, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  useFocusFirstError(ref, state);
  const v = (k: keyof RaceValues) => state.values?.[k] ?? initial[k] ?? "";
  const e = (k: string) => state.errors?.[k];
  return (
    <form action={formAction} ref={ref} className="stackform" noValidate>
      <Field name="name" label="Nom" required defaultValue={v("name")} error={e("name")} />
      <div className="row2">
        <Field name="date" label="Date" type="date" required defaultValue={v("date")} error={e("date")} />
        <Field name="distance_km" label="Distance (km)" inputMode="decimal" required defaultValue={v("distance_km")} error={e("distance_km")} placeholder="16,2" />
      </div>
      <div className="row2">
        <Field name="dplus" label="Dénivelé + (m)" inputMode="numeric" defaultValue={v("dplus")} error={e("dplus")} placeholder="275" />
        <Field name="pace" label="Allure objectif (m:ss /km)" inputMode="text" defaultValue={v("pace")} error={e("pace")} placeholder="4:50" hint="Facultative. Sert aux temps de passage." />
      </div>
      {mode === "edit" && (
        <>
          <Field name="checkpoints" label="Repères de passage" rows={6} defaultValue={v("checkpoints")} error={e("checkpoints")} hint="Une ligne par repère : km | nom | consigne" />
          <Field name="notes" label="Notes" rows={3} defaultValue={v("notes")} />
        </>
      )}
      <FormMessage state={state} />
      <div><SubmitButton pendingLabel={mode === "create" ? "Création…" : "Enregistrement…"}>{mode === "create" ? "Créer la course" : "Enregistrer les modifications"}</SubmitButton></div>
    </form>
  );
}

// Suppression en deux temps, sans boîte de dialogue du navigateur (qui bloque les agents et se rate au clavier).
export function DeleteRace({ name, action }: { name: string; action: Action }) {
  const [state, formAction] = useActionState(action, IDLE);
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button type="button" className="btn danger-ghost" onClick={() => setConfirm(true)}>Supprimer cette course…</button>;
  return (
    <form action={formAction} className="confirm" role="group" aria-label="Confirmer la suppression">
      <p>Supprimer « {name} » ? Son tracé, ses repères et ses notes seront perdus. Tes courses Strava ne changent pas.</p>
      <FormMessage state={state} />
      <div className="actions">
        <SubmitButton tone="danger" pendingLabel="Suppression…">Oui, supprimer</SubmitButton>
        <button type="button" className="btn" onClick={() => setConfirm(false)} autoFocus>Annuler</button>
      </div>
    </form>
  );
}
