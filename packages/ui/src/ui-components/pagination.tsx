import { Label, Shad } from "../components";
import { Button } from "./button";
import Select from "./select";

type Props = {
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const Pagination = ({
  page = 1,
  pageSize = 10,
  totalPages = 0,
  onPageChange,
  onPageSizeChange,
}: Props) => {
  console.log({ page, pageSize, totalPages });
  const options = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "30", label: "30" },
    { value: "40", label: "40" },
    { value: "50", label: "50" },
  ];

  return (
    <Shad.Pagination className="flex items-center justify-between md:justify-center gap-2 p-2">
      <div className="flex gap-2 items-center">
        <Label htmlFor="rows-per-page" className="whitespace-nowrap">
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
      <div className="flex items-cent gap-1">
        {page} of {totalPages}
      </div>

      <div className="flex items-cent gap-1">
        <Button
          variant="outline"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="hidden md:block"
          iconName={"ChevronsLeft"}
        />
        <Button
          variant="outline"
          onClick={() => onPageChange(Number(page) - 1)}
          disabled={page <= 1}
          iconName={"ChevronLeft"}
        />
        <Button
          variant="outline"
          onClick={() => onPageChange(Number(page) + 1)}
          disabled={page >= totalPages}
          iconName={"ChevronRight"}
        />
        <Button
          variant="outline"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="hidden md:block"
          iconName={"ChevronsRight"}
        />
      </div>
    </Shad.Pagination>
  );
};
export default Pagination;
