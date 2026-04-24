export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDFCF0] pt-24 px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-3">
            <div className="h-8 w-48 bg-amber-100 rounded-lg"></div>
            <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
          </div>
          <div className="h-6 w-24 bg-amber-100 rounded-full"></div>
        </div>

        {/* List Skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl flex gap-4 items-start border border-amber-50">
            <div className="w-12 h-12 bg-gray-100 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-50 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}