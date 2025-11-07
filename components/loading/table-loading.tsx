import { Skeleton } from '@/components/ui/skeleton'

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      {/* Table header */}
      <div className="border-b p-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b p-4 last:border-b-0">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
