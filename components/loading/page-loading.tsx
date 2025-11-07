import { Skeleton } from '@/components/ui/skeleton'

export function PageLoading() {
  return (
    <div className="flex min-h-screen flex-col p-24 space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
