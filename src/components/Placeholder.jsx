export default function Placeholder({ kicker, title, description, height = "h-72", children }) {
  return (
    <section className="pt-12">
      <p className="mb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-pop">{kicker}</p>
      <h2 className="mb-4 text-[1.5rem] font-extrabold tracking-[-.01em] text-accent">{title}</h2>
      <div
        className={`${height} flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface/60 p-6 text-center`}
      >
        <p className="max-w-xl text-[.95rem] text-muted">{description}</p>
        {children}
      </div>
    </section>
  );
}
