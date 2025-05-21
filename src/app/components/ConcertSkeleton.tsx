import { Skeleton } from "@/components/ui/skeleton";

const ConcertSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-md p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          <div className="pt-2">
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConcertSkeleton; 