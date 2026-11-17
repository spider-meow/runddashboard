// Crée l'abonnement aux événements Strava (une seule fois, une fois l'app déployée).
// Usage : node --env-file=.env.local scripts/strava-subscribe.mjs https://run.harbi.eu/api/strava/webhook
// Strava appelle aussitôt l'URL en GET pour valider : l'app doit donc déjà être en ligne avec STRAVA_WEBHOOK_VERIFY_TOKEN défini.
const [callback] = process.argv.slice(2);
const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN } = process.env;
if (!callback || !STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_WEBHOOK_VERIFY_TOKEN) {
  console.error("Usage : node --env-file=.env.local scripts/strava-subscribe.mjs <url du webhook>  (variables STRAVA_* requises)");
  process.exit(1);
}
const r = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
  method: "POST",
  // Le même secret sert de verify_token (validation GET) et de ?token= (chaque événement POST doit le porter).
  body: new URLSearchParams({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, callback_url: `${callback}?token=${encodeURIComponent(STRAVA_WEBHOOK_VERIFY_TOKEN)}`, verify_token: STRAVA_WEBHOOK_VERIFY_TOKEN }),
});
console.log(r.status, await r.text());
