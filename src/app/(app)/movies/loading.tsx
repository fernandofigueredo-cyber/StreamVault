export default function MoviesLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="skeleton h-8 w-28 rounded-lg" />
        <div className="skeleton h-4 w-80 rounded" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/6">
            <div className="skeleton aspect-video w-full" />
            <div className="space-y-1.5 bg-black/20 p-3">
              <div className="skeleton h-3.5 w-4/5 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
