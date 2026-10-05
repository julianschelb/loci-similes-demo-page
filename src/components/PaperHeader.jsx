import { useState } from "react";
import { paper } from "../paper.js";

const Icon = ({ d, className = "" }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const icons = {
  pdf: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></>,
  cite: <><path d="M10 11H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6a4 4 0 0 1-4 4" /><path d="M20 11h-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6a4 4 0 0 1-4 4" /></>,
  data: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  code: <><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
};

function ActionButton({ href, onClick, icon, children, variant = "secondary", active = false }) {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[.95rem] font-semibold transition " +
    "hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-accent";
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    pop: "border-pop-soft bg-pop-soft text-pop hover:border-pop",
  };
  const cls = `${base} ${styles[variant]}`;
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener">
        <Icon d={icon} />
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      <Icon d={icon} />
      {children}
    </button>
  );
}

export default function PaperHeader() {
  const [showCite, setShowCite] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyBibtex = async () => {
    try {
      await navigator.clipboard.writeText(paper.bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the text stays selectable in the box */
    }
  };

  return (
    <header className="pt-10 pb-2">
      <p className="mb-1 text-[.7rem] font-semibold uppercase tracking-[.08em] text-muted">Dataset explorer</p>
      <h1 className="mb-3 font-serif text-[2rem] font-semibold leading-[1.18] text-ink sm:text-[2.3rem]">
        {paper.title}
      </h1>

      <p className="mb-1 text-[1.05rem] font-semibold text-ink-2">
        {paper.authors.map((a, i) => (
          <span key={a.name}>
            {a.url ? (
              <a className="hover:text-accent hover:underline" href={a.url} target="_blank" rel="noopener">{a.name}</a>
            ) : (
              a.name
            )}
            <sup className="ml-0.5 font-mono text-[.65rem] text-muted">{a.affiliation}</sup>
            {i < paper.authors.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>
      <p className="mb-2 text-[.85rem] font-semibold text-muted">
        {Object.entries(paper.affiliations).map(([k, v]) => (
          <span key={k} className="mr-4 inline-block">
            <sup className="mr-0.5 font-mono text-[.65rem]">{k}</sup>{v}
          </span>
        ))}
      </p>
      <p className="text-[.9rem] font-semibold italic text-muted">{paper.venue}</p>

      <hr className="my-6 border-line" />

      <div className="grid gap-5 md:grid-cols-[1fr_190px]">
        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h2 className="mb-2 font-serif text-[1.2rem] font-semibold">Abstract</h2>
          <p className="text-[.98rem] leading-[1.65] text-ink-2">{paper.abstract}</p>
        </div>

        <nav aria-label="Paper links" className="flex flex-col gap-2.5">
          <ActionButton href={paper.links.pdf} icon={icons.pdf} variant="primary">Paper</ActionButton>
          <ActionButton onClick={() => setShowCite((v) => !v)} icon={icons.cite} active={showCite}>Cite</ActionButton>
          <ActionButton href={paper.links.data} icon={icons.data}>Datasets</ActionButton>
          <ActionButton href={paper.links.code} icon={icons.code}>Code</ActionButton>
        </nav>
      </div>

      {showCite && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-serif text-[1rem] font-semibold">BibTeX</h2>
            <button
              type="button"
              onClick={copyBibtex}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[.8rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent"
            >
              <Icon d={copied ? icons.check : icons.copy} className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-line-soft p-4 font-mono text-[.8rem] leading-relaxed text-ink-2">{paper.bibtex}</pre>
        </div>
      )}
    </header>
  );
}
