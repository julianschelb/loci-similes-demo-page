export default function Placeholder({ description, height = "h-72", children }) {
  return (
    <div className={`${height} flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface/60 p-6 text-center`}>
      <p className="max-w-xl text-[.95rem] text-muted">{description}</p>
      {children}
    </div>
  );
}
