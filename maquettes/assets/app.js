/* Coque commune : navigation, thèmes, accent, tiroir de personnalisation (afficher / masquer / réordonner). */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem("rd." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("rd." + k, JSON.stringify(v)); } catch (e) { /* mode privé : on ignore */ } },
  };
  const ic = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    home: ic('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
    hist: ic('<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>'),
    proj: ic('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
    race: ic('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    cfg: ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    up: ic('<path d="M6 15l6-6 6 6"/>'), down: ic('<path d="M6 9l6 6 6-6"/>'),
    eye: ic('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeoff: ic('<path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.7M6.6 6.7A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.2-1"/>'),
    size: ic('<path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/>'),
    grip: ic('<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>'),
  };
  const NAV = [["home", "index.html", "Accueil"], ["hist", "historique.html", "Historique"], ["proj", "projections.html", "Projections"], ["race", "course.html", "Courses"], ["link", "connexion.html", "Données"]];
  const page = document.body.dataset.page;

  // ----- navigation -----
  const links = NAV.map(([k, h, t]) => `<a href="${h}" aria-label="${t}" title="${t}" ${page === k ? 'aria-current="page"' : ""}>${I[k]}</a>`).join("");
  const rail = document.getElementById("rail"), tabbar = document.getElementById("tabbar");
  if (rail) rail.innerHTML = `<div class="logo" aria-hidden="true">rd</div>${links}<div class="spacer"></div><a href="#" id="open-cfg" aria-label="Personnaliser" title="Personnaliser">${I.cfg}</a>`;
  if (tabbar) tabbar.innerHTML = links + `<a href="#" id="open-cfg-m" aria-label="Personnaliser">${I.cfg}</a>`;

  // ----- thème + accent -----
  const THEMES = { ember: ["#14110f", "#26201c", "#ea5b2e"], paper: ["#f7f1e8", "#f0e9de", "#d8481f"], nocturne: ["#0b0d12", "#1a1e27", "#5b8def"] };
  const NAMES = { ember: "Ember", paper: "Paper", nocturne: "Nocturne" };
  const ACCENTS = ["#ea5b2e", "#d8481f", "#5b8def", "#3fae7a", "#c06ad9", "#d9a521"];
  const root = document.documentElement;
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  function applyTheme(t) { if (t) root.dataset.theme = t; else delete root.dataset.theme; }
  function applyAccent(a) {
    if (!a) { root.style.removeProperty("--accent"); root.style.removeProperty("--on-accent"); return; }
    root.style.setProperty("--accent", a); root.style.setProperty("--on-accent", lum(a) > .35 ? "#14110f" : "#ffffff");
  }
  applyTheme(store.get("theme", null)); applyAccent(store.get("accent", null));

  // ----- widgets de la page -----
  const grid = document.getElementById("grid");
  const cards = grid ? [...grid.querySelectorAll(".card[data-w]")] : [];
  const SIZES = ["s", "m", "l", "xl"];
  const label = (c) => c.dataset.label || c.querySelector("h2")?.firstChild?.textContent.trim() || c.dataset.w;
  cards.forEach((c, i) => c.style.setProperty("--i", i));
  let prefs = store.get("w." + page, null) || cards.map((c) => ({ id: c.dataset.w, visible: true, size: c.dataset.size }));
  cards.forEach((c) => { if (!prefs.find((p) => p.id === c.dataset.w)) prefs.push({ id: c.dataset.w, visible: true, size: c.dataset.size }); });
  function applyPrefs() {
    prefs.forEach((p) => { const c = grid.querySelector(`[data-w="${p.id}"]`); if (!c) return; grid.appendChild(c); c.hidden = !p.visible; c.dataset.size = p.size; });
  }
  if (grid) applyPrefs();
  const save = () => { store.set("w." + page, prefs); applyPrefs(); renderList(); };

  // ----- tiroir -----
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const drawer = document.createElement("aside"); drawer.className = "drawer"; drawer.setAttribute("aria-label", "Personnaliser"); drawer.setAttribute("role", "dialog");
  drawer.innerHTML = `
    <h3>Personnaliser</h3>
    <h4>Thème</h4><div class="themes" id="d-themes"></div>
    <h4>Couleur d'accent</h4><div class="accents" id="d-acc"></div>
    ${grid ? '<h4>Widgets de cette page</h4><ul class="wlist" id="d-list"></ul><p style="font-size:13px;color:var(--mute);margin-top:12px">Glisse ou utilise les flèches. Le choix est gardé dans ce navigateur (en vrai : table user_prefs).</p>' : ""}
    <p style="margin-top:24px"><button class="btn" id="d-reset">Réinitialiser</button> <button class="btn primary" id="d-close">Fermer</button></p>`;
  document.body.append(scrim, drawer);
  const open = (v) => { drawer.classList.toggle("open", v); scrim.classList.toggle("on", v); if (v) drawer.querySelector("button").focus(); };
  document.addEventListener("click", (e) => { if (e.target.closest("#open-cfg, #open-cfg-m, .js-cfg")) { e.preventDefault(); open(true); } });
  scrim.onclick = () => open(false); drawer.querySelector("#d-close").onclick = () => open(false);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });

  const tbox = drawer.querySelector("#d-themes");
  function renderThemes() {
    const cur = root.dataset.theme || "ember";
    tbox.innerHTML = Object.keys(THEMES).map((k) => `<button class="theme-opt" data-t="${k}" aria-pressed="${k === cur}"><div class="sw">${THEMES[k].map((c) => `<i style="background:${c}"></i>`).join("")}</div>${NAMES[k]}</button>`).join("");
  }
  tbox.onclick = (e) => { const b = e.target.closest("[data-t]"); if (!b) return; store.set("theme", b.dataset.t); applyTheme(b.dataset.t); renderThemes(); };
  renderThemes();

  const abox = drawer.querySelector("#d-acc");
  function renderAcc() {
    const cur = store.get("accent", null);
    abox.innerHTML = ACCENTS.map((c) => `<button style="background:${c}" data-a="${c}" aria-label="Accent ${c}" aria-pressed="${c === cur}"></button>`).join("") + `<input type="color" id="d-pick" value="${cur || "#ea5b2e"}" aria-label="Couleur libre">`;
  }
  abox.onclick = (e) => { const b = e.target.closest("[data-a]"); if (!b) return; store.set("accent", b.dataset.a); applyAccent(b.dataset.a); renderAcc(); };
  abox.oninput = (e) => { if (e.target.id === "d-pick") { store.set("accent", e.target.value); applyAccent(e.target.value); } };
  renderAcc();

  drawer.querySelector("#d-reset").onclick = () => {
    store.set("theme", null); store.set("accent", null); store.set("w." + page, null);
    applyTheme(null); applyAccent(null); renderThemes(); renderAcc();
    if (grid) { prefs = cards.map((c) => ({ id: c.dataset.w, visible: true, size: c.dataset.size })); location.reload(); }
  };

  const list = drawer.querySelector("#d-list");
  function renderList() {
    if (!list) return;
    list.innerHTML = prefs.map((p, i) => {
      const c = grid.querySelector(`[data-w="${p.id}"]`); if (!c) return "";
      return `<li draggable="true" data-i="${i}"><span class="grab" aria-hidden="true">${I.grip}</span><span class="name">${label(c)}</span>
        <button data-act="size" aria-label="Changer la taille (${p.size})" title="Taille : ${p.size.toUpperCase()}">${I.size}</button>
        <button data-act="up" aria-label="Monter">${I.up}</button><button data-act="down" aria-label="Descendre">${I.down}</button>
        <button data-act="vis" aria-label="${p.visible ? "Masquer" : "Afficher"}" aria-pressed="${p.visible}">${p.visible ? I.eye : I.eyeoff}</button></li>`;
    }).join("");
  }
  if (list) {
    renderList();
    list.onclick = (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return; const i = +b.closest("li").dataset.i, a = b.dataset.act;
      if (a === "vis") prefs[i].visible = !prefs[i].visible;
      if (a === "size") prefs[i].size = SIZES[(SIZES.indexOf(prefs[i].size) + 1) % SIZES.length];
      if (a === "up" && i > 0) [prefs[i - 1], prefs[i]] = [prefs[i], prefs[i - 1]];
      if (a === "down" && i < prefs.length - 1) [prefs[i + 1], prefs[i]] = [prefs[i], prefs[i + 1]];
      save();
    };
    let from = null;
    list.ondragstart = (e) => { from = +e.target.closest("li").dataset.i; e.target.closest("li").classList.add("drag"); };
    list.ondragover = (e) => e.preventDefault();
    list.ondrop = (e) => { const to = +e.target.closest("li")?.dataset.i; if (from == null || isNaN(to)) return; prefs.splice(to, 0, prefs.splice(from, 1)[0]); from = null; save(); };
    list.ondragend = () => renderList();
  }
})();
