import { useLayoutEffect, useRef, useState } from "react";
import { OP_STYLE } from "./labels.js";
import { reuseTags as tagReuse, sourceTags as tagSource, UNLINKED } from "./unlinked.js";

// The mapping, laid out across the width: the source passage on top, the reuse passage below, each on one line
// (the pane scrolls sideways for long passages), and one curve per link from the source word down to the reuse word,
// coloured by operation and thicker and more opaque the more confident (as in the Gradio demo's diagram).

const HEAD_LENGTH = 7, HEAD_WIDTH = 7;

const STROKE = {
  COPY: "var(--color-op-copy)",
  INFLECT: "var(--color-op-inflect)",
  SUBST: "var(--color-op-subst)",
  SPLIT: "var(--color-op-split)",
  MERGE: "var(--color-op-split)",
};

function Words({ tokens, side, tags, linked, register, hover, onHover }) {
  return (
    <p className="flex flex-nowrap items-start gap-x-1.5 whitespace-nowrap font-serif text-[1.05rem] leading-snug">
      {tokens.map((token, i) => {
        const key = `${side}:${i}`;
        const tag = tags[i];
        const style = OP_STYLE[tag] ?? OP_STYLE.INS;
        const on = hover?.has(key);
        const plain = !linked.has(i) && tag !== "MARK";
        const word = (
          <span ref={(el) => register(key, el)} onMouseEnter={() => onHover(key)} onMouseLeave={() => onHover(null)}
                className={`rounded-sm px-1 transition-colors ${plain ? "text-muted" : `${style.bg} text-ink`} ${
                  on ? `outline outline-2 ${plain ? "outline-muted" : style.outline}` : ""}`}
                title={side === "reuse" || plain ? `${token}: ${tag}` : token}>
            {token}
          </span>
        );
        if (side !== "reuse") return <span key={i}>{word}</span>;
        // the reuse word's label sits below it, clear of the arrows arriving from above
        return (
          <span key={i} className="inline-flex flex-col items-center">
            {word}
            <span className={`mt-0.5 font-sans text-[.6rem] font-semibold uppercase tracking-wide ${
              UNLINKED.has(tag) ? "text-muted/70" : style.text}`}>{tag}</span>
          </span>
        );
      })}
    </p>
  );
}

// The layout position of an element inside `root`, summed over its offset parents. Unlike getBoundingClientRect it
// ignores transforms, so the dialog scaling in while it opens (.dialog-in) cannot shift the arrows off their words.
function offsetIn(el, root) {
  let x = 0, y = 0;
  for (let node = el; node && node !== root; node = node.offsetParent) { x += node.offsetLeft; y += node.offsetTop; }
  return { x, y };
}

export default function MappingDiagram({ source, reuse, links, spans = [] }) {
  const [rects, setRects] = useState({});
  // the row whose first linked word sits further left is indented, so the first link runs straight down
  const [shift, setShift] = useState({ source: 0, reuse: 0 });
  const [hoverKey, setHoverKey] = useState(null);
  const els = useRef(new Map());
  const wrap = useRef(null);       // the full-width content, which the curves are measured against
  const scroller = useRef(null);   // the visible window, scrolled sideways

  const register = (key, el) => (el ? els.current.set(key, el) : els.current.delete(key));

  // align the two rows at the citing passage's first link (adapted for the demo: the two passages differ much in
  // length, and without it the arrows of a short quotation run far off to the side)
  useLayoutEffect(() => {
    const first = [...links].sort((a, b) => a.r - b.r)[0];
    const a = first && els.current.get(`source:${first.s}`), b = first && els.current.get(`reuse:${first.r}`);
    if (!a || !b || !wrap.current) return;
    const sx = offsetIn(a, wrap.current).x - shift.source;
    const rx = offsetIn(b, wrap.current).x - shift.reuse;
    const next = { source: Math.max(0, rx - sx), reuse: Math.max(0, sx - rx) };
    if (Math.abs(next.source - shift.source) > 0.5 || Math.abs(next.reuse - shift.reuse) > 0.5) setShift(next);
  }, [source, reuse, links, shift]);

  // measure every word once laid out, again when the width changes (resize, fonts arriving)
  useLayoutEffect(() => {
    const measure = () => {
      if (!wrap.current) return;
      const next = { box: { width: wrap.current.offsetWidth, height: wrap.current.offsetHeight } };
      els.current.forEach((el, key) => {
        const { x, y } = offsetIn(el, wrap.current);
        next[key] = { x: x + el.offsetWidth / 2, top: y, bottom: y + el.offsetHeight };
      });
      setRects(next);
    };
    measure();
    // open each pair scrolled to its first link, with a little context before it
    const first = Math.min(...links.map((e) => Math.min(
      els.current.get(`source:${e.s}`)?.offsetLeft ?? Infinity, els.current.get(`reuse:${e.r}`)?.offsetLeft ?? Infinity)));
    if (scroller.current) scroller.current.scrollLeft = Number.isFinite(first) ? Math.max(0, first - 80) : 0;
    const observer = new ResizeObserver(measure);
    observer.observe(wrap.current);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [source, reuse, links, shift]);

  const reuseTags = tagReuse(reuse.length, links, spans);
  const sourceTags = tagSource(source.length, links);
  const linkedSource = new Set(links.map((e) => e.s));
  const linkedReuse = new Set(links.map((e) => e.r));

  // hovering a word lights up its links and the words at their other ends
  const hot = links.filter((e) => hoverKey === `source:${e.s}` || hoverKey === `reuse:${e.r}`);
  const hover = hoverKey ? new Set([hoverKey, ...hot.flatMap((e) => [`source:${e.s}`, `reuse:${e.r}`])]) : null;

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-2">
      <div ref={wrap} className="relative w-max min-w-full pr-4">
        <p className="mb-1 text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">Source</p>
        <div style={{ paddingLeft: shift.source }}>
          <Words tokens={source} side="source" tags={sourceTags} linked={linkedSource} register={register}
                 hover={hover} onHover={setHoverKey} />
        </div>
        <div className="h-24" aria-hidden="true" />
        <div style={{ paddingLeft: shift.reuse }}>
          <Words tokens={reuse} side="reuse" tags={reuseTags} linked={linkedReuse} register={register}
                 hover={hover} onHover={setHoverKey} />
        </div>
        <p className="mt-1 text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">Citing</p>

        {rects.box && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {links.map((e) => {
              const a = rects[`source:${e.s}`], b = rects[`reuse:${e.r}`];
              if (!a || !b) return null;
              const confidence = e.p ?? 1;
              const on = hot.includes(e);
              // the curve ends vertically, so the head is a downward triangle whose tip touches the reuse word;
              // the line stops at the head's base and both share one opacity
              const colour = STROKE[e.op] ?? "var(--color-ink-2)";
              const tip = b.top - 1, base = tip - HEAD_LENGTH, mid = (a.bottom + base) / 2;
              return (
                <g key={`${e.r}-${e.s}`} opacity={hoverKey ? (on ? 0.9 : 0.08) : 0.25 + 0.4 * confidence}>
                  <path d={`M ${a.x} ${a.bottom + 1} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${base}`}
                        fill="none" stroke={colour} strokeWidth={(on ? 1.5 : 1) * (0.8 + 1.4 * confidence)} />
                  <path d={`M ${b.x} ${tip} L ${b.x - HEAD_WIDTH / 2} ${base} L ${b.x + HEAD_WIDTH / 2} ${base} Z`} fill={colour} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
      </div>

      <p className="mt-2 min-h-5 text-xs text-ink-2">
        {hot.length
          ? hot.map((e) => `${source[e.s]} → ${reuse[e.r]} · ${e.op}${e.p != null ? ` ${e.p.toFixed(2)}` : ""}`).join("   ")
          : <span className="text-muted">Hover a word to see its link.</span>}
      </p>
    </div>
  );
}
