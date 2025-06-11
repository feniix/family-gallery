import { Skeleton } from '@/components/ui/skeleton';

interface ImageSkeletonProps {
  className?: string;
}

export function ImageSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div className="aspect-square">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

interface PhotoGridSkeletonProps {
  count?: number;
}

export function PhotoGridSkeleton({ count = 12 }: PhotoGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ImageSkeleton key={index} />
      ))}
    </div>
  );
} 