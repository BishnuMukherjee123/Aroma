import { BrandLockup } from "@/components/auth/BrandLockup";
import { DashboardPreview } from "@/components/auth/DashboardPreview";
import { LoginForm } from "@/components/auth/LoginForm";
import { PortalFooter } from "@/components/auth/PortalFooter";

export default function ManagerLoginPage() {
  return (
    <main className="auth-grid relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-7rem] left-[-6rem] h-64 w-64 rounded-full bg-surface-container-high/80 blur-[96px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-12">
        <BrandLockup
          title="Aroma Manager"
          subtitle="Restaurant Operations Portal"
        />

        <section className="relative mt-10 flex w-full items-center justify-center xl:min-h-[30rem]">
          <div className="relative z-10 w-full max-w-[28rem] animate-auth-fade-up">
            <LoginForm portalVariant="manager" />
          </div>
          <div className="pointer-events-none hidden xl:absolute xl:right-2 xl:top-1/2 xl:block xl:-translate-y-1/2">
            <DashboardPreview />
          </div>
        </section>

        <PortalFooter />
      </div>
    </main>
  );
}
