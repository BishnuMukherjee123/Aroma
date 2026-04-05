export function DashboardPreview() {
  return (
    <div className="animate-auth-panel relative w-[25rem]">
      <div className="rounded-[1.75rem] border-[8px] border-white/90 bg-surface-container-high p-5 shadow-[0_28px_60px_rgba(18,28,42,0.16)]">
        <div className="overflow-hidden rounded-[1.2rem] bg-[#2a313b] p-5 text-white/90">
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.18em] text-white/50">
            <span>Production Menu</span>
            <span>86.3%</span>
          </div>

          <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
              <span>Dish</span>
              <span>Orders</span>
              <span>Status</span>
              <span>Price</span>
            </div>

            {[
              ["Smoked Burger", "142", "Live", "$12"],
              ["Lemon Pasta", "83", "Live", "$15"],
              ["Pepper Pizza", "117", "Live", "$19"],
              ["Lotus Tart", "58", "Draft", "$9"],
            ].map(([name, orders, status, price]) => (
              <div
                key={name}
                className="mt-3 grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-[0.74rem] text-white/72"
              >
                <span>{name}</span>
                <span>{orders}</span>
                <span
                  className={
                    status === "Live" ? "text-[#8ce8a6]" : "text-white/45"
                  }
                >
                  {status}
                </span>
                <span>{price}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
            <div className="flex items-center justify-between text-[0.72rem] font-semibold text-white/70">
              <span>Weekly Engagement</span>
              <span className="text-[#8ce8a6]">+18%</span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              {[28, 34, 29, 41, 47, 53, 62].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-full bg-white/[0.06]">
                    <div
                      className="rounded-full bg-gradient-to-t from-primary to-primary-fixed-dim"
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <span className="text-[0.6rem] uppercase tracking-[0.14em] text-white/32">
                    {["M", "T", "W", "T", "F", "S", "S"][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
