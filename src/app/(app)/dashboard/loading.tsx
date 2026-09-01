export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-9 w-64 rounded-lg" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-28 rounded-xl" />
          <div className="skeleton h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card rounded-2xl p-4 space-y-2">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-7 w-12 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Rails */}
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-40 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[220px] shrink-0 overflow-hidden rounded-2xl border border-white/6">
                <div className="skeleton aspect-video w-full" />
                <div className="space-y-1.5 bg-black/20 p-3">
                  <div className="skeleton h-3.5 w-4/5 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
