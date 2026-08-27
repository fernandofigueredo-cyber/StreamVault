import { SkeletonGrid } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-7 w-56 rounded-lg" />
        <div className="skeleton h-4 w-80 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card rounded-2xl p-4">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton mt-3 h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
      <SkeletonGrid count={10} />
    </div>
  );
}
