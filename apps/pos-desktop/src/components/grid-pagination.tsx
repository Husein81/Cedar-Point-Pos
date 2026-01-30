import { Button, cn, Icon, Shad } from "@repo/ui";
import { Activity } from "react";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};
const getPageNumbers = (current: number, total: number, delta = 1) => {
  const range: (number | "...")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);

  if (left > 2) range.push("...");

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (right < total - 1) range.push("...");

  if (total > 1) range.push(total);

  return range;
};

const GridPagination = ({ page, totalPages, onPageChange }: Props) => {
  const pages = getPageNumbers(page, totalPages);

  return (
    <Shad.Pagination className="w-full">
      <div className="flex items-center justify-center gap-1 py-3">
        {/* Prev */}
        <Activity mode={totalPages > 1 ? "visible" : "hidden"}>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            iconName="ChevronLeft"
          />
        </Activity>

        {/* Page numbers */}
        {pages.map((p, idx) =>
          p === "..." ? (
            <Icon
              key={`dots-${idx}`}
              name="Ellipsis"
              className="size-4 text-muted-foreground"
            />
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === page ? "default" : "outline"}
              className={cn("min-w-9", p === page && "pointer-events-none")}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}

        {/* Next */}
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          iconName="ChevronRight"
        />
      </div>
    </Shad.Pagination>
  );
};

export default GridPagination;
