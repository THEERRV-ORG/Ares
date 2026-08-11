export function AssigneeBadges({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
