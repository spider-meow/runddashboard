import type { CSSProperties, ReactNode } from "react";
import { Cards, type Item, type Size } from "./Cards";

// Squelettes de chargement : ils réutilisent les classes et la grille des vraies pages (héros, cartes numérotées, tableaux),
// donc au moment où le contenu arrive rien ne bouge. Décoratifs (aria-hidden) ; un seul message « Chargement » est annoncé.
type Dim = number | string;
export function Sk({ w = "100%", h = 16, r, style }: { w?: Dim; h?: Dim; r?: Dim; style?: CSSProperties }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function Loading({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" data-skeleton>
      <span className="sr">Chargement…</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function HeaderSk({ back = false, title = 360 }: { back?: boolean; title?: Dim }) {
  return (
    <>
      {back && <p className="back"><Sk w={96} h={14} /></p>}
      <header className="top"><div><p className="eyebrow"><Sk w={180} h={12} /></p><h1 className="title"><Sk w={title} h="clamp(36px, 6vw, 80px)" style={{ marginTop: 8 }} /></h1></div></header>
    </>
  );
}

const H2 = ({ w = 140 }: { w?: Dim }) => <h2><Sk w={w} h={12} /></h2>;
const Lines = ({ n, gap = 14 }: { n: number; gap?: number }) => <div style={{ display: "grid", gap }}>{Array.from({ length: n }, (_, i) => <Sk key={i} h={18} w={i % 2 ? "82%" : "100%"} />)}</div>;
const Chart = ({ h = 190 }: { h?: number }) => <Sk h={h} r={4} style={{ marginTop: 8 }} />;
const Rows = ({ n }: { n: number }) => <div>{Array.from({ length: n }, (_, i) => <div className="pr" key={i}><Sk w="46%" h={16} /><Sk w={56} h={16} /></div>)}</div>;
const card = (id: string, size: Size, node: ReactNode, tone?: "hot"): Item => ({ id, size, node, tone });

export function HomeSk() {
  return (
    <Loading>
      <section className="hero">
        <div className="hero-map"><Sk h="auto" style={{ aspectRatio: "640 / 440", borderRadius: "50%", opacity: .5 }} /></div>
        <div className="hero-body" style={{ width: "100%" }}>
          <Sk w={260} h={12} />
          <Sk w="min(100%, 420px)" h="clamp(96px, 20vw, 230px)" />
          <Sk w="min(100%, 480px)" h="clamp(30px, 4.6vw, 56px)" />
          <div className="hero-facts">{[0, 1, 2, 3].map((i) => <div key={i}><Sk w={70} h={11} /><Sk w={92} h={34} style={{ marginTop: 6 }} /></div>)}</div>
          <Sk w={300} h={18} />
          <Sk w={150} h={44} />
        </div>
      </section>
      <Cards items={[
        card("rhythm", "xl", <><H2 w={90} /><div style={{ display: "grid", gap: 12 }}><Sk w="min(100%, 360px)" h={26} /><Chart h={230} /></div></>),
        card("last", "m", <><H2 w={150} /><Sk w="70%" h={22} /><Sk w="55%" h={96} style={{ margin: "12px 0" }} /><Sk h={16} /></>, "hot"),
        card("pace", "m", <><H2 w={180} /><Chart /></>),
        card("elev", "xl", <><H2 w={170} /><Chart /></>),
        card("shoes", "m", <><H2 w={110} /><Rows n={2} /></>),
        card("prs", "m", <><H2 w={90} /><Rows n={5} /></>),
      ]} />
    </Loading>
  );
}

const Stat = () => <div className="stat"><Sk w={120} h={12} /><Sk w="60%" h="clamp(40px, 5vw, 64px)" style={{ marginTop: 10 }} /><Sk w="80%" h={14} style={{ marginTop: 12 }} /></div>;

export function HistoriqueSk() {
  return (
    <Loading>
      <HeaderSk title={420} />
      <Cards items={[
        card("s1", "s", <Stat />, "hot"), card("s2", "s", <Stat />), card("s3", "s", <Stat />),
        card("volume", "l", <><H2 w={200} /><Chart h={220} /></>),
        card("prs", "s", <><H2 w={150} /><Rows n={6} /></>),
        card("pace", "l", <><H2 w={220} /><Chart h={220} /></>),
        card("recent", "xl", <><H2 w={150} /><Lines n={8} gap={18} /></>),
      ]} />
    </Loading>
  );
}

export function SortieSk() {
  return (
    <Loading>
      <HeaderSk back title={300} />
      <dl className="facts">{[0, 1, 2, 3, 4].map((i) => <div key={i}><Sk w={80} h={11} /><Sk w={150} h="clamp(44px, 7vw, 80px)" style={{ marginTop: 8 }} /></div>)}</dl>
      <Cards items={[
        card("map", "m", <><H2 w={60} /><Sk h="auto" style={{ aspectRatio: "400 / 300" }} r={4} /></>),
        card("pace", "m", <><H2 w={180} /><Chart h={230} /></>),
        card("elev", "xl", <><H2 w={170} /><Chart /></>),
        card("splits", "xl", <><H2 w={120} /><Lines n={7} gap={20} /></>),
      ]} />
    </Loading>
  );
}

export function ProjectionsSk() {
  return (
    <Loading>
      <HeaderSk title={380} />
      <section className="proj">
        <Sk w={300} h={12} />
        <Sk w="min(100%, 560px)" h="clamp(88px, 17vw, 190px)" />
        <Sk w={320} h={20} />
        <Sk h={10} style={{ margin: "32px 0 12px" }} />
        <Sk w="70%" h={20} />
        <div className="scen">{[0, 1, 2].map((i) => <div key={i}><Sk w={70} h={11} /><Sk w="70%" h={34} style={{ marginTop: 6 }} /><Sk w={60} h={13} style={{ marginTop: 4 }} /></div>)}</div>
        <Sk w={330} h={44} style={{ marginTop: 16 }} />
      </section>
      <Cards items={[
        card("trend", "l", <><H2 w={120} /><Sk w="min(100%, 300px)" h={26} /><Chart /></>),
        card("table", "m", <><H2 w={170} /><Lines n={4} gap={20} /></>),
        card("sources", "m", <><H2 w={190} /><Rows n={3} /></>),
        card("calib", "m", <><H2 w={80} /><Rows n={4} /></>),
        card("limits", "m", <><H2 w={190} /><Lines n={4} /></>),
      ]} />
    </Loading>
  );
}

const ListRow = () => <div className="list-link"><span style={{ display: "grid", gap: 8, width: "70%" }}><Sk w="55%" h={22} /><Sk h={14} /></span><Sk w={56} h={24} r={999} /></div>;
const Fields = ({ n }: { n: number }) => <div className="stackform">{Array.from({ length: n }, (_, i) => <div className="field" key={i}><Sk w={90} h={12} /><Sk h={44} style={{ marginTop: 8 }} /></div>)}<Sk w={150} h={44} /></div>;

export function CoursesSk() {
  return (
    <Loading>
      <HeaderSk title={300} />
      <div className="next-race">
        <Sk w={200} h={12} /><Sk w="min(100%, 520px)" h="clamp(40px, 7vw, 80px)" /><Sk w={280} h={16} />
        <Sk w={340} h={44} style={{ marginTop: 8 }} /><Sk w="70%" h={20} />
      </div>
      <Cards items={[
        card("upcoming", "l", <><H2 w={80} /><ListRow /><ListRow /></>),
        card("new", "s", <><H2 w={140} /><Fields n={3} /></>),
      ]} />
    </Loading>
  );
}

export function FicheSk() {
  return (
    <Loading>
      <HeaderSk back title={420} />
      <section className="proj compact">
        <Sk w={260} h={12} /><Sk w="min(100%, 480px)" h="clamp(64px, 11vw, 130px)" /><Sk w={360} h={20} /><Sk w="70%" h={20} />
      </section>
      <Cards items={[
        card("strategy", "xl", <><H2 w={180} /><Sk w="min(100%, 520px)" h={26} /><Lines n={3} /><Chart h={170} /><Lines n={8} gap={20} /></>),
        card("fuel", "m", <><H2 w={120} /><Rows n={3} /></>),
        card("climbs", "m", <><H2 w={150} /><Rows n={2} /></>),
        card("map", "l", <><H2 w={60} /><Sk h="auto" style={{ aspectRatio: "400 / 300" }} r={4} /></>),
        card("notes", "s", <><H2 w={70} /><Lines n={3} /></>),
        card("elev", "xl", <><H2 w={190} /><Chart h={200} /></>),
      ]} />
    </Loading>
  );
}

export function PageSk() {
  return (
    <Loading>
      <HeaderSk />
      <Cards items={[card("a", "l", <><H2 /><Lines n={4} /></>), card("b", "s", <><H2 /><Lines n={3} /></>)]} />
    </Loading>
  );
}
