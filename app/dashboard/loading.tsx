// Skeleton state while dashboard data loads. Mirrors the page layout so
// there is no layout shift.
export default function DashboardLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="h-7 w-64 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-36 rounded bg-slate-200" />
        </div>
        <div className="h-7 w-32 rounded-full bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="rounded-xl border-t-4 border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-8 w-24 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-32 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-88 rounded-xl bg-white p-6 shadow-sm lg:col-span-3">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-4 h-64 rounded bg-slate-100" />
        </div>
        <div className="h-88 rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-4 h-64 rounded bg-slate-100" />
        </div>
      </div>

      <div className="h-80 rounded-xl bg-white p-6 shadow-sm">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-4 h-56 rounded bg-slate-100" />
      </div>
    </div>
  );
}
