import Image from "next/image";
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
            <button type="button" className="font-semibold text-gray-600 underline cursor-pointer bg-transparent border-0 p-0">
              Terms of Service
            </button>
          </p>
        </div>
      </div>

      {/* ── Right: Food photo grid ────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-1/2 h-screen sticky top-0 overflow-hidden group">
        <div className="grid h-full grid-cols-3 grid-rows-4 gap-1 rounded-l-[2rem] overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image
                src={`/login/${i + 1}.jpg`}
                alt=""
                fill
                sizes="(min-width: 1024px) 16vw, 0px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
                style={{ transitionDelay: `${i * 30}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
