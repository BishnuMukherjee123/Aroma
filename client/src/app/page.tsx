import { BrandLockup } from "@/components/auth/BrandLockup";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-white">
      {/* ── Left: Form column ─────────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center px-8 py-12 lg:w-1/2 lg:px-16">
        <div className="w-full max-w-md">
          <BrandLockup
            title="Aroma AR Administrator"
            subtitle=""
          />

          <div className="mt-10">
            <LoginForm portalVariant="owner" />
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            By clicking Sign in, you agree to Aroma&apos;s{" "}
            <a href="#" className="font-semibold text-gray-600 underline">
              Terms of Service
            </a>
          </p>
        </div>
      </div>

      {/* ── Right: Food photo grid ────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-1/2 h-screen sticky top-0 overflow-hidden">
        <div className="grid h-full grid-cols-3 grid-rows-4 gap-1 rounded-l-[2rem] overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="overflow-hidden">
              <img
                src={`/login/${i + 1}.jpg`}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
