import Link from "next/link";

const footerLinks = [
  { label: "Security", href: "#" },
  { label: "Support", href: "#" },
  { label: "Privacy", href: "#" },
];

export function PortalFooter() {
  return (
    <footer className="animate-auth-fade-up mt-12 flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-4 text-sm font-medium text-outline">
        {footerLinks.map((link, index) => (
          <div key={link.label} className="flex items-center gap-4">
            <Link className="transition-colors hover:text-primary" href={link.href}>
              {link.label}
            </Link>
            {index < footerLinks.length - 1 ? (
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-outline/65">
        © 2026 Aroma Augmented Reality Systems
      </p>
    </footer>
  );
}
