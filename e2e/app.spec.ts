import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const FAKE = "http://127.0.0.1:54399";
const owner = () => {
  const payload = `42.${Math.floor(Date.now() / 1000) + 3600}`;
  return `${payload}.${createHmac("sha256", "e2e-secret").update(payload).digest("hex")}`;
};

test.beforeEach(async ({ context, page }) => {
  await fetch(`${FAKE}/__reset`, { method: "POST" });
  await context.addCookies([{ name: "rd_session", value: owner(), url: "http://127.0.0.1:3101" }]);
  page.on("pageerror", (e) => { throw e; });
});

// GPX synthétique : une ligne droite à allure constante (4:00 /km). Départ et distance réglables, pour fabriquer un doublon exact.
function gpx(start: Date, km: number, name = "Footing importé") {
  const n = Math.round(km * 100), pts = Array.from({ length: n + 1 }, (_, i) => {
    const lat = 48.8 + (i * 10) / 111_320, t = new Date(start.getTime() + i * 2400); // 10 m tous les 2,4 s
    return `<trkpt lat="${lat.toFixed(6)}" lon="2.19"><ele>${(100 + (i % 40) * 0.1).toFixed(1)}</ele><time>${t.toISOString()}</time></trkpt>`;
  });
  return Buffer.from(`<?xml version="1.0"?><gpx version="1.1" creator="e2e"><trk><name>${name}</name><trkseg>${pts.join("")}</trkseg></trk></gpx>`);
}
const upload = (page: Page, buf: Buffer, name = "sortie.gpx") => page.locator('input[type="file"]').first().setInputFiles({ name, mimeType: "application/gpx+xml", buffer: buf });

test("sans session : la page de connexion, pas les données", async ({ context, page }) => {
  await context.clearCookies();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Se connecter avec Strava" })).toBeVisible();
  await page.goto("/historique");
  await expect(page).toHaveURL(/\/$/);
});

test("les cinq pages s'affichent avec leur titre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Semi de Garches");
  await expect(page.locator('[data-widget="countdown"]')).toContainText(/J-2[234]/);
  for (const [link, title] of [["Historique", "Historique"], ["Projections", "Projections"], ["Courses", "courses"], ["Données", "Données"]] as const) {
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title, { ignoreCase: true });
  }
});

test.describe("courses", () => {
  test("créer, retrouver dans la liste, modifier, supprimer", async ({ page }) => {
    await page.goto("/courses");
    const form = page.locator('[data-widget="new"]');
    await form.getByLabel("Nom").fill("10 km de test");
    await form.getByLabel("Date").fill("2030-05-01");
    await form.getByLabel("Distance (km)").fill("10");
    await form.getByRole("button", { name: "Créer la course" }).click();
    await expect(page).toHaveURL(/\/courses\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("10 km de test");
    await expect(page.getByText("Course créée.")).toBeVisible();

    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Courses" }).click();
    await expect(page.getByRole("link", { name: /10 km de test/ })).toBeVisible(); // le cache a été invalidé par la création

    await page.getByRole("link", { name: /10 km de test/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("10 km de test"); // la fiche est arrivée (sinon on remplirait le formulaire de la liste)
    await page.getByLabel("Allure objectif (m:ss /km)").fill("4:45");
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Allure objectif (m:ss /km)")).toHaveValue("4:45");

    await page.getByRole("button", { name: "Supprimer cette course…" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page.getByText("Course supprimée.")).toBeVisible();
    await expect(page.getByRole("link", { name: /10 km de test/ })).toHaveCount(0);
  });

  test("une erreur de saisie garde le formulaire rempli et signale le champ", async ({ page }) => {
    await page.goto("/courses");
    const form = page.locator('[data-widget="new"]');
    await form.getByLabel("Nom").fill("Sans date");
    await form.getByLabel("Distance (km)").fill("abc");
    await form.getByRole("button", { name: "Créer la course" }).click();
    await expect(form.getByLabel("Nom")).toHaveValue("Sans date");
    await expect(form.getByLabel("Distance (km)")).toHaveAttribute("aria-invalid", "true");
  });

  test("modifier l'objectif met l'accueil à jour tout de suite (cache invalidé)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-widget="race"]')).toContainText("4:50");
    await page.goto("/courses/11111111-1111-4111-8111-111111111111");
    await page.getByLabel("Allure objectif (m:ss /km)").fill("4:40");
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Accueil" }).click();
    await expect(page.locator('[data-widget="race"]')).toContainText("4:40");
  });
});

test.describe("import de sorties", () => {
  test("importer un GPX, le retrouver, le rouvrir, le supprimer", async ({ page }) => {
    await page.goto("/donnees");
    await upload(page, gpx(new Date(Date.now() - 3 * 864e5), 6));
    await page.getByRole("button", { name: "Importer la sortie" }).click();
    await expect(page.getByText(/Activité importée : « Footing importé »/)).toBeVisible();

    await page.goto("/historique");
    await expect(page.getByRole("link", { name: "Footing importé" })).toBeVisible();
    await page.getByRole("link", { name: "Footing importé" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Footing importé");
    await expect(page.getByText("Importée depuis un fichier GPX")).toBeVisible();

    await page.getByRole("button", { name: "Supprimer cette sortie…" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page.getByText("Sortie supprimée.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Footing importé" })).toHaveCount(0);
  });

  test("le même fichier importé deux fois n'ajoute rien", async ({ page }) => {
    const file = gpx(new Date(Date.now() - 4 * 864e5), 6, "Une fois");
    await page.goto("/donnees");
    await upload(page, file);
    await page.getByRole("button", { name: "Importer la sortie" }).click();
    await expect(page.getByText(/Activité importée/)).toBeVisible();
    await page.reload();
    await upload(page, file);
    await page.getByRole("button", { name: "Importer la sortie" }).click();
    await expect(page.getByText("Ce fichier est déjà importé")).toBeVisible();
  });

  test("un fichier qui double une sortie Strava est signalé « Doublon »", async ({ page }) => {
    const dump = await (await fetch(`${FAKE}/__dump`)).json();
    const twin = dump.activities[1]; // 8,02 km
    await page.goto("/donnees");
    await upload(page, gpx(new Date(Date.parse(twin.started_at) + 60_000), twin.distance_m / 1000, "Copie de la montre"));
    await page.getByRole("button", { name: "Importer la sortie" }).click();
    await expect(page.getByText(/Activité importée/)).toBeVisible();
    await page.goto("/historique");
    const row = page.getByRole("row", { name: /Copie de la montre/ });
    await expect(row.getByText("Doublon")).toBeVisible();
    await row.getByRole("link").click();
    await expect(page.getByRole("status").filter({ hasText: "déjà présente via Strava" })).toBeVisible();
  });

  test("un fichier illisible donne un message clair", async ({ page }) => {
    await page.goto("/donnees");
    await upload(page, Buffer.from("pas du gpx"), "vide.gpx");
    await page.getByRole("button", { name: "Importer la sortie" }).click();
    await expect(page.getByText(/Fichier illisible/)).toBeVisible();
  });
});

test("projections : « utiliser comme objectif » l'enregistre sur la course", async ({ page }) => {
  await page.goto("/projections");
  await page.getByRole("button", { name: /comme objectif de « Semi de Garches »/ }).click();
  await expect(page.getByText("Objectif enregistré sur la fiche de la course.")).toBeVisible();
  const dump = await (await fetch(`${FAKE}/__dump`)).json();
  expect(dump.races[0].target_pace_s).not.toBe(290);
});

test("calibrage du relief : la carte explique le modèle utilisé", async ({ page }) => {
  await page.goto("/projections");
  const card = page.locator('[data-widget="calib"]');
  await expect(card).toContainText("Calibrage du relief");
  await expect(card).toContainText(/Kilomètres analysés/);
});

test("graphiques : un toucher affiche l'infobulle", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: "http://127.0.0.1:3101", hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });
  await ctx.addCookies([{ name: "rd_session", value: owner(), url: "http://127.0.0.1:3101" }]);
  const page = await ctx.newPage();
  await page.goto("/historique");
  await page.locator('[data-widget="volume"] rect[data-tip]').nth(20).tap();
  await expect(page.locator('[data-widget="volume"] .tip2.on')).toContainText("semaine du");
  await page.getByRole("heading", { level: 1 }).tap();
  await expect(page.locator('[data-widget="volume"] .tip2.on')).toHaveCount(0);
  await ctx.close();
});

test("chargement : un squelette de la même forme s'affiche pendant la lecture, puis cède la place", async ({ page }) => {
  // Réponses de /projections retardées dès le départ (préchargement compris) : le clic sur l'onglet doit basculer sans attendre.
  await page.route(/\/projections\?_rsc/, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.goto("/");
  await fetch(`${FAKE}/__latency?ms=1500`, { method: "POST" });
  // Une écriture vide le cache : la page suivante relit la base (lentement), le squelette doit apparaître aussitôt.
  await page.goto("/courses/11111111-1111-4111-8111-111111111111");
  await page.getByLabel("Allure objectif (m:ss /km)").fill("4:41");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
  // Clic sur un onglet : bascule immédiate vers le squelette de la destination, sans attendre le serveur (réponse retardée ici).
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Projections" }).click();
  await expect(page.locator("[data-skeleton]")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Projections", { ignoreCase: true });
  await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  await fetch(`${FAKE}/__latency?ms=0`, { method: "POST" });
});
