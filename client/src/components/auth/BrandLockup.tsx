import Image from "next/image";

export function BrandLockup({
  title = "Aroma AR",
  subtitle = "Management Portal",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="flex items-center gap-3">
      <Image
        src="/favicon.ico"
        alt="Aroma logo"
        width={40}
        height={40}
        className="size-10 rounded-xl"
      />
      <span className="text-lg font-bold tracking-tight text-gray-900">
        {title}
      </span>
    </header>
  );
}
