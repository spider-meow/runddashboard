/* Graphiques SVG sans dépendance. Voir DESIGN.md (traits fins, grille discrète, infobulle au survol). */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a = {}, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let tip; // infobulle unique
  function tipShow(x, y, html) {
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "status"); document.body.appendChild(tip); }
    tip.innerHTML = html; tip.classList.add("on");
    const w = tip.offsetWidth; tip.style.left = Math.min(innerWidth - w - 8, x + 14) + "px"; tip.style.top = y - 40 + "px";
  }
  const tipHide = () => tip && tip.classList.remove("on");

  // la viewBox colle à la largeur réelle : le texte garde sa taille en pixels. On redessine si la largeur change.
  const width = (svg) => Math.max(260, Math.round(svg.getBoundingClientRect().width) || 800);
  const auto = (fn) => (svg, ...a) => {
    svg.classList.add("chart"); // avant la mesure : sinon le svg vide mesure 300px
    fn(svg, ...a); let w = width(svg);
    new ResizeObserver(() => { const n = width(svg); if (Math.abs(n - w) > 8) { w = n; fn(svg, ...a); } }).observe(svg);
  };

  function setup(svg, W, H) { svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.classList.add("chart"); svg.innerHTML = ""; return svg; }
  const scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

  // quand l'élément entre à l'écran, on lance l'animation de dessin
  function onView(node, fn) {
    if (reduce || !("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: .35 });
    io.observe(node);
  }

  // ---------- carte synthétique, tracé qui se dessine ----------
  function drawMap(host, pts, opts = {}) {
    const svg = el("svg", { viewBox: "0 0 400 300", role: "img", "aria-label": opts.label || "Tracé de la course" });
    host.innerHTML = ""; host.appendChild(svg);
    for (let x = 0; x <= 400; x += 40) el("line", { x1: x, y1: 0, x2: x, y2: 300, class: "grid-bg" }, svg);
    for (let y = 0; y <= 300; y += 40) el("line", { x1: 0, y1: y, x2: 400, y2: y, class: "grid-bg" }, svg);
    const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L");
    el("path", { d, class: "route-bg" }, svg);
    const path = el("path", { d, class: "route draw" }, svg);
    const len = path.getTotalLength(); path.style.setProperty("--len", len);
    const dot = el("circle", { r: 6, class: "runner", cx: pts[0][0], cy: pts[0][1] }, svg);
    const api = {
      len, path, dot,
      at(frac) { const p = path.getPointAtLength(Math.max(0, Math.min(1, frac)) * len); dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); },
      marks(list, total) { // list: [{km,name}]
        list.forEach((c) => { const p = path.getPointAtLength((c.km / total) * len);
          el("circle", { cx: p.x, cy: p.y, r: 5, class: "mk" }, svg);
          const t = el("text", { x: p.x + 9, y: p.y + 3, class: "mk-t" }, svg); t.textContent = c.km ? c.km : "D"; });
      },
    };
    onView(host, () => {
      path.classList.add("go");
      if (reduce) return api.at(1);
      const t0 = performance.now(), D = 2200;
      (function step(t) { const f = Math.min(1, (t - t0) / D); api.at(1 - Math.pow(1 - f, 3)); if (f < 1) requestAnimationFrame(step); })(t0);
    });
    return api;
  }

  // ---------- profil de dénivelé ----------
  function elevation(svg, elev, o = {}) {
    const W = width(svg), H = o.h || 180, m = { l: 36, r: 8, t: 10, b: 22 };
    setup(svg, W, H); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Profil de dénivelé");
    const km = elev.length / 10, lo = Math.floor(Math.min(...elev) / 10) * 10 - 5, hi = Math.ceil(Math.max(...elev) / 10) * 10 + 5;
    const x = scale(0, km, m.l, W - m.r), y = scale(lo, hi, H - m.b, m.t);
    [lo + 5, (lo + hi) / 2, hi - 5].forEach((v) => { el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "grid-l" }, svg); el("text", { x: 0, y: y(v) + 4 }, svg).textContent = Math.round(v) + " m"; });
    for (let k = 0; k <= km; k += Math.max(2, Math.round(km / 8))) el("text", { x: x(k), y: H - 4, "text-anchor": "middle" }, svg).textContent = k;
    const pts = elev.map((v, i) => [x(i / 10), y(v)]);
    const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L");
    el("path", { d: d + `L${W - m.r} ${H - m.b}L${m.l} ${H - m.b}Z`, class: "area" }, svg);
    const line = el("path", { d, class: "line draw" }, svg); const len = line.getTotalLength(); line.style.setProperty("--len", len);
    onView(svg, () => line.classList.add("go"));
    (o.marks || []).forEach((c) => { const i = Math.round(c.km * 10); el("line", { x1: x(c.km), x2: x(c.km), y1: y(elev[i]), y2: H - m.b, class: "ref" }, svg); });
    const cross = el("line", { class: "cross", y1: m.t, y2: H - m.b, opacity: 0 }, svg), pt = el("circle", { r: 5, class: "pt", opacity: 0 }, svg);
    const hit = el("rect", { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: "transparent", tabindex: 0 }, svg);
    const move = (e) => {
      const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(elev.length - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (elev.length - 1))));
      cross.setAttribute("x1", pts[i][0]); cross.setAttribute("x2", pts[i][0]); cross.setAttribute("opacity", 1);
      pt.setAttribute("cx", pts[i][0]); pt.setAttribute("cy", pts[i][1]); pt.setAttribute("opacity", 1);
      tipShow(e.clientX, e.clientY, `${(i / 10).toFixed(1)} km · ${Math.round(elev[i])} m`);
      o.onHover && o.onHover(i / (elev.length - 1));
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerleave", () => { cross.setAttribute("opacity", 0); pt.setAttribute("opacity", 0); tipHide(); o.onLeave && o.onLeave(); });
  }

  // ---------- allure par kilomètre (barres) ----------
  function paceBars(svg, splits, o = {}) {
    const W = width(svg), H = o.h || 200, m = { l: 40, r: o.target ? 74 : 8, t: 14, b: 22 };
    setup(svg, W, H); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Allure par kilomètre");
    const paces = splits.map((s) => s.pace), hi = Math.max(...paces) + 8, lo = Math.min(...paces) - 14;
    const y = scale(hi, lo, H - m.b, m.t); // plus rapide = plus haut
    const bw = (W - m.l - m.r) / splits.length;
    [lo + 6, (lo + hi) / 2, hi - 6].forEach((v) => { el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "grid-l" }, svg); el("text", { x: 0, y: y(v) + 4 }, svg).textContent = RD.fmtPace(v); });
    splits.forEach((s, i) => {
      const x0 = m.l + i * bw + 3, w = bw - 6, top = y(s.pace);
      const b = el("rect", { x: x0, y: top, width: w, height: H - m.b - top, rx: 4, class: "bar" + (s.partial ? " mute" : ""), style: `--k:${i}` }, svg);
      b.addEventListener("pointermove", (e) => tipShow(e.clientX, e.clientY, `km ${s.km} · ${RD.fmtPace(s.pace)} /km` + (s.elev != null ? ` · ${s.elev > 0 ? "+" : ""}${s.elev} m` : "")));
      b.addEventListener("pointerleave", tipHide);
      el("text", { x: x0 + w / 2, y: H - 6, "text-anchor": "middle" }, svg).textContent = s.km;
    });
    if (o.target) { const ty = y(o.target); el("line", { x1: m.l, x2: W - m.r, y1: ty, y2: ty, class: "ref" }, svg); el("line", { x1: W - m.r, x2: W - m.r + 6, y1: ty, y2: ty, class: "ref" }, svg); el("text", { x: W - m.r + 10, y: ty + 4 }, svg).textContent = (o.targetLabel || "moy.") + " " + RD.fmtPace(o.target); }
  }

  // ---------- volume hebdomadaire (barres) ----------
  function volume(svg, weeks, o = {}) {
    const W = width(svg), H = o.h || 200, m = { l: 34, r: 8, t: 14, b: 22 };
    setup(svg, W, H); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Volume hebdomadaire en kilomètres");
    const hi = Math.ceil(Math.max(...weeks.map((w) => w.km)) / 20) * 20, y = scale(0, hi, H - m.b, m.t), bw = (W - m.l - m.r) / weeks.length;
    [0, hi / 2, hi].forEach((v) => { el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "grid-l" }, svg); el("text", { x: 0, y: y(v) + 4 }, svg).textContent = v; });
    weeks.forEach((w, i) => {
      const x0 = m.l + i * bw + 2, ww = bw - 4, top = y(w.km);
      const last = i === weeks.length - 1;
      const b = el("rect", { x: x0, y: top, width: ww, height: H - m.b - top, rx: 4, class: "bar" + (last ? " mute" : ""), style: `--k:${i}` }, svg);
      b.addEventListener("pointermove", (e) => tipShow(e.clientX, e.clientY, `sem. ${i + 1} · ${w.km} km · ${RD.fmtPace(w.pace)} /km`));
      b.addEventListener("pointerleave", tipHide);
      if (i % 4 === 0) el("text", { x: x0 + ww / 2, y: H - 6, "text-anchor": "middle" }, svg).textContent = "S" + (i + 1);
    });
  }

  // ---------- courbe d'allure (ligne) ----------
  function paceLine(svg, weeks, o = {}) {
    const W = width(svg), H = o.h || 200, m = { l: 40, r: 8, t: 14, b: 22 };
    setup(svg, W, H); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Allure moyenne par semaine");
    const p = weeks.map((w) => w.pace), hi = Math.max(...p) + 6, lo = Math.min(...p) - 6;
    const x = scale(0, weeks.length - 1, m.l, W - m.r), y = scale(hi, lo, H - m.b, m.t);
    [lo + 4, (lo + hi) / 2, hi - 4].forEach((v) => { el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "grid-l" }, svg); el("text", { x: 0, y: y(v) + 4 }, svg).textContent = RD.fmtPace(v); });
    const pts = p.map((v, i) => [x(i), y(v)]);
    const d = "M" + pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L");
    el("path", { d: d + `L${W - m.r} ${H - m.b}L${m.l} ${H - m.b}Z`, class: "area" }, svg);
    const line = el("path", { d, class: "line draw" }, svg); line.style.setProperty("--len", line.getTotalLength());
    onView(svg, () => line.classList.add("go"));
    const cross = el("line", { class: "cross", y1: m.t, y2: H - m.b, opacity: 0 }, svg), pt = el("circle", { r: 5, class: "pt", opacity: 0 }, svg);
    const hit = el("rect", { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(weeks.length - 1, Math.round((((e.clientX - r.left) / r.width) * W - m.l) / (W - m.l - m.r) * (weeks.length - 1))));
      cross.setAttribute("x1", pts[i][0]); cross.setAttribute("x2", pts[i][0]); cross.setAttribute("opacity", 1);
      pt.setAttribute("cx", pts[i][0]); pt.setAttribute("cy", pts[i][1]); pt.setAttribute("opacity", 1);
      tipShow(e.clientX, e.clientY, `sem. ${i + 1} · ${RD.fmtPace(p[i])} /km`);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("opacity", 0); pt.setAttribute("opacity", 0); tipHide(); });
  }

  window.Charts = { drawMap, elevation: auto(elevation), paceBars: auto(paceBars), volume: auto(volume), paceLine: auto(paceLine) };
})();
