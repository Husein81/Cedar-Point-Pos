import { Label, Shad } from "../components";
import { Button } from "./button";
import Select from "./select";

type Props = {
  rows?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const Pagination = ({
  rows = 0,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}: Props) => {
  const options: { value: string; label: string }[] = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "30", label: "30" },
    { value: "40", label: "40" },
    { value: "50", label: "50" },
  ];

  return (
    <Shad.Pagination className="flex items-center justify-between w-full p-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Total {rows} rows
      </span>

      <div className="flex items-center justify-between md:justify-center gap-4">
        <div className="flex gap-2 items-center">
          <Label htmlFor="rows-per-page" className="text-sm whitespace-nowrap">
            rows per page
          </Label>
          <Select
            value={pageSize?.toString() ?? "10"}
            onChange={(option) => onPageSizeChange(Number(option.value))}
            options={options}
            side={"bottom"}
            className="w-20"
          />
        </div>

        <div className="flex text-sm items-cent gap-1">
          {page} of {totalPages}
        </div>

        <div className="flex items-cent gap-1">
          <Button
            variant="outline"
            size={"sm"}
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="hidden md:block"
            iconName={"ChevronsLeft"}
          />
          <Button
            variant="outline"
            size={"sm"}
            onClick={() => onPageChange(Number(page) - 1)}
            disabled={page <= 1}
            iconName={"ChevronLeft"}
          />
          <Button
            variant="outline"
            size={"sm"}
            onClick={() => onPageChange(Number(page) + 1)}
            disabled={page >= totalPages}
            iconName={"ChevronRight"}
          />
          <Button
            variant="outline"
            size={"sm"}
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="hidden md:block"
            iconName={"ChevronsRight"}
          />
        </div>
      </div>
    </Shad.Pagination>
  );
};
export default Pagination;
