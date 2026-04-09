export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full bg-[#f4f6fb]">
      {/* Header skeleton */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-8 py-5">
        <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse mb-2" />
        <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 px-8 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-2.5 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        {/* Content rows */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
            <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-slate-100" />
                  <div className="h-3 bg-slate-100 rounded" style={{ width: `${100 + i * 30}px` }} />
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded mb-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-100 shrink-0" />
                  <div className="h-3 bg-slate-100 rounded flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
