// Assemble les 5 pages des maquettes en UN fichier pour un Artifact : navigation par hash, aucun fichier annexe.
// Usage : node maquettes/build-artifact.mjs   ->  maquettes/artifact/rundashboard.html (+ preview.html avec doctype, pour tester en local)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(dir, f), "utf8");

// clé de page (RDApp.mount) -> fichier source -> route hash (jamais un nom réservé par claude.ai)
const PAGES = [["home", "index.html", "accueil"], ["hist", "historique.html", "historique"], ["proj", "projections.html", "projections"], ["race", "course.html", "course"], ["link", "connexion.html", "donnees"]];
const hrefs = Object.fromEntries(PAGES.map(([, f, r]) => [f, "#" + r]));
const relink = (s) => s.replace(/(["'])(index|historique|projections|course|connexion)\.html\1/g, (m, q, n) => q + hrefs[n + ".html"] + q);

// le viewer pose data-theme="dark|light" sur <html> : nos thèmes passent sur data-rd pour ne pas entrer en collision
let tokens = read("assets/tokens.css").replace(/data-theme/g, "data-rd");
const midnightBody = /:root\[data-rd="midnight"\]\s*\{([^}]*)\}/.exec(tokens)[1];
tokens = tokens.replace(":root:not([data-rd]) {", ':root:not([data-rd]):not([data-theme="light"]) {')
  + `\n/* le viewer a choisi « sombre » explicitement */\n:root[data-theme="dark"]:not([data-rd]) {${midnightBody}}\n`;
const fontsUrl = /<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/.exec(read("index.html"))[1];
const app = relink(read("assets/app.js")).replace(/root\.dataset\.theme/g, "root.dataset.rd");

const parts = PAGES.map(([key, file]) => {
  const src = read(file);
  const css = /<style>([\s\S]*?)<\/style>/.exec(src)[1];
  const html = relink(/<main>([\s\S]*?)<\/main>/.exec(src)[1]);
  const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return { key, css, html, js: scripts[scripts.length - 1][1] };
});

const pagesJs = parts.map((p) => `  ${p.key}: { css: ${JSON.stringify(p.css)}, html: ${JSON.stringify(p.html).replace(/<\//g, "<\\/")}, init() {\n${p.js}\n  } },`).join("\n");
const routes = JSON.stringify(Object.fromEntries(PAGES.map(([k, , r]) => [r, k])));

const head = `<title>Rundashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsUrl}" rel="stylesheet">
<style>
${tokens}
${read("assets/base.css")}
.tabbar { padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px)); }
</style>
<style id="page-style"></style>`;

const body = `<div class="shell">
  <nav class="rail" id="rail" aria-label="Navigation"></nav>
  <main id="view"></main>
</div>
<nav class="tabbar" id="tabbar" aria-label="Navigation"></nav>
<script>
${read("assets/data.js")}
</script>
<script>
${read("assets/charts.js")}
</script>
<script>
${app}
</script>
<script>
const PAGES = {
${pagesJs}
};
const ROUTES = ${routes};
const view = document.getElementById("view"), pageStyle = document.getElementById("page-style");
function show() {
  const key = ROUTES[location.hash.slice(1)] || "home";
  pageStyle.textContent = PAGES[key].css;
  view.innerHTML = PAGES[key].html;
  RDApp.mount(key);
  PAGES[key].init();
  scrollTo(0, 0);
}
RDApp.onReset = show;
addEventListener("hashchange", show);
show();
</script>`;

mkdirSync(join(dir, "artifact"), { recursive: true });
writeFileSync(join(dir, "artifact/rundashboard.html"), head + "\n" + body + "\n");
writeFileSync(join(dir, "artifact/preview.html"), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>`);
console.log("ok", PAGES.length, "pages");
