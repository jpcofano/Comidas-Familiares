import { SkeletonRow } from "./SkeletonRow";

interface SkeletonListProps {
  count: number;
}

export function SkeletonList({ count }: SkeletonListProps) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
