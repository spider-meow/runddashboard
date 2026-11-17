"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { describeSync } from "@/lib/forms";

type Result = { tone: "ok" | "warn" | "error"; text: string };

// Message d'échec : un Strava déconnecté ne se règle pas en réessayant, une panne passagère oui.
const failure = (reason: string) => `Synchronisation impossible : ${reason}. ${/connect/i.test(reason) ? "Reconnecte-toi avec Strava depuis cette page." : "Réessaie dans un moment."}`;

// Lance la synchronisation Strava sans quitter la page, annonce le résultat, puis recharge les données affichées.
// Sans JavaScript, le formulaire fonctionne quand même (le serveur redirige vers la page d'origine).
export function SyncButton({ label = "Synchroniser" }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/strava/sync", { method: "POST", headers: { Accept: "application/json" } });
      if (r.status === 401) { location.href = "/"; return; } // session expirée
      const body = await r.json().catch(() => ({}));
      setRes(r.ok ? describeSync(body) : { tone: "error", text: failure(body.error ?? `erreur ${r.status}`) });
      router.refresh();
    } catch {
      setRes({ tone: "error", text: "Synchronisation impossible : le serveur n'a pas répondu. Vérifie ta connexion et réessaie." });
    } finally { setBusy(false); }
  }

  const cls = res?.tone === "ok" ? "ok" : res?.tone === "warn" ? "notice" : "alert";
  return (
    <div className="sync">
      <form action="/api/strava/sync" method="post" onSubmit={run}>
        <button className="btn" type="submit" disabled={busy} aria-busy={busy}>{busy && <span className="spin" aria-hidden="true" />}{busy ? "Synchronisation…" : label}</button>
      </form>
      <div aria-live="polite" aria-atomic="true">{res && <p className={`${cls} pop`}>{res.text}</p>}</div>
    </div>
  );
}
