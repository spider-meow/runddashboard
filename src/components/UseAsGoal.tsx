"use client";

import { useState, useTransition } from "react";
import { setRaceTarget } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { fmtPace } from "@/lib/pace";

// « Viser cette allure » : l'allure projetée devient l'objectif de la course (une action serveur, résultat annoncé sur place).
export function UseAsGoal({ raceId, paceS, name }: { raceId: string; paceS: number; name: string }) {
  const [saving, start] = useTransition();
  const [res, setRes] = useState<FormState | null>(null);
  return (
    <div className="use-goal">
      <button type="button" className="btn primary" disabled={saving} aria-busy={saving} onClick={() => start(async () => setRes(await setRaceTarget(raceId, paceS)))}>
        {saving && <span className="spin" aria-hidden="true" />}Utiliser {fmtPace(paceS)} /km comme objectif de « {name} »
      </button>
      <div aria-live="polite" aria-atomic="true">{res && <p className={`${res.status === "ok" ? "ok" : "alert"} pop`}>{res.message}</p>}</div>
    </div>
  );
}
