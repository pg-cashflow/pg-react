export function AppLoadingScreen({ label = "PG Cashflow" }: { label?: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <div className="t-h1 font-extrabold text-accent">{label}</div>
    </div>
  );
}
