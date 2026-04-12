export function BrandLockup({
  title = "Aroma AR",
  subtitle = "Management Portal",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="animate-auth-fade-up text-center">
      <div className="mx-auto flex h-16 w-16 animate-auth-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container shadow-[0_14px_36px_rgba(182,23,34,0.22)]">
        <div className="relative h-7 w-7">
          <span className="absolute left-[0.2rem] top-1/2 h-6 w-[0.22rem] -translate-y-1/2 rotate-45 rounded-full bg-white" />
          <span className="absolute right-[0.2rem] top-1/2 h-6 w-[0.22rem] -translate-y-1/2 -rotate-45 rounded-full bg-white" />
          <span className="absolute left-[0.02rem] top-[0.18rem] h-2.5 w-2.5 rounded-full border-[0.18rem] border-white" />
          <span className="absolute right-[0.02rem] bottom-[0.18rem] h-1.6 w-1.6 rounded-full bg-white" />
        </div>
      </div>
      <h1 className="mt-5 text-[2.35rem] font-extrabold tracking-[-0.04em] text-on-surface">
        {title}
      </h1>
      <p className="mt-1 text-sm font-semibold text-on-surface-variant">
        {subtitle}
      </p>
    </header>
  );
}
