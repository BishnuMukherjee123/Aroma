export function BrandLockup({
  title = "Aroma AR",
  subtitle = "Management Portal",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="flex items-center gap-3">
      <img
        src="/favicon.ico"
        alt="Aroma logo"
        className="h-10 w-10 rounded-xl"
      />
      <span className="text-lg font-bold tracking-tight text-gray-900">
        {title}
      </span>
    </header>
  );
}
