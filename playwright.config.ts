import { defineConfig, devices } from "@playwright/test";

// Parcours de bout en bout contre l'app compilée (cache et préchargement actifs, comme en production) et un faux Supabase en mémoire.
const APP = 3101, FAKE = 54399;
const env = {
  SUPABASE_URL: `http://127.0.0.1:${FAKE}`, SUPABASE_SECRET_KEY: "test", SESSION_SECRET: "e2e-secret", OWNER_ATHLETE_ID: "42", MAP_TILES: "off",
  FAKE_PORT: String(FAKE), FAKE_LOG: process.env.FAKE_LOG ?? "",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // un seul faux Supabase partagé : les tests s'exécutent l'un après l'autre
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: { baseURL: `http://127.0.0.1:${APP}`, ...devices["Desktop Chrome"], launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {} },
  webServer: [
    { command: "node e2e/fake-supabase.mjs", url: `http://127.0.0.1:${FAKE}/__dump`, env, reuseExistingServer: false },
    { command: `npm run build && npm run start -- -p ${APP}`, url: `http://127.0.0.1:${APP}`, env, timeout: 240_000, reuseExistingServer: false },
  ],
});
