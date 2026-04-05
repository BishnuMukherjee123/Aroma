"use client";

type ReadinessCardProps = {
  readinessPercent: number;
  hasMenu: boolean;
  publishedDishesCount: number;
  readyModelCount: number;
  isPublished: boolean;
  isPublishing: boolean;
  onGoLive: () => void;
};

const readinessTone = (ready: boolean) =>
  ready
    ? {
        icon: "check_circle",
        iconClass: "text-emerald-500",
      }
    : {
        icon: "pending",
        iconClass: "text-slate-300",
      };

export function ReadinessCard({
  readinessPercent,
  hasMenu,
  publishedDishesCount,
  readyModelCount,
  isPublished,
  isPublishing,
  onGoLive,
}: ReadinessCardProps) {
  const checks = [
    {
      label: "Has Menu?",
      meta: hasMenu ? "Primary menu ready" : "No menus yet",
      ready: hasMenu,
    },
    {
      label: "Published Dishes?",
      meta:
        publishedDishesCount > 0
          ? `${publishedDishesCount} published`
          : "No published dishes",
      ready: publishedDishesCount > 0,
    },
    {
      label: "Has 3D Assets?",
      meta:
        readyModelCount > 0 ? `${readyModelCount} model ready` : "Upload missing",
      ready: readyModelCount > 0,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
      <div className="absolute right-4 top-4">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
          {readinessPercent}% Ready
        </span>
      </div>

      <h2 className="text-xl font-bold tracking-[-0.03em] text-on-surface">
        Readiness Check
      </h2>

      <div className="mt-6 space-y-4">
        {checks.map((check) => {
          const tone = readinessTone(check.ready);
          return (
            <div
              key={check.label}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-[1.2rem] ${tone.iconClass}`}
                >
                  {tone.icon}
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {check.label}
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                {check.meta}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onGoLive}
          disabled={isPublishing}
          className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span>{isPublished ? "Workspace Live" : "Go Live"}</span>
          <span className="material-symbols-outlined text-[1rem]">
            rocket_launch
          </span>
        </button>
      </div>
    </section>
  );
}
