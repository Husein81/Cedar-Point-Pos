import { Label, Shad } from "../components";
import Select from "./select";

type Props = {
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const Pagination = ({
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: Props) => {
  const options = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "30", label: "30" },
    { value: "40", label: "40" },
    { value: "50", label: "50" },
  ];
  return (
    <Shad.Pagination>
      <div className="flex gap-2 items-center">
        <Label htmlFor="rows-per-page" className="whitespace-nowrap">
          rows per page
        </Label>
        <Select
          value={pageSize.toString()}
          onChange={(option) => onPageSizeChange(Number(option.value))}
          options={options}
          side={"top"}
          className="w-20"
        />
      </div>
      <div className="flex items-cent gap-1">
        {page} of {totalPages}
      </div>

      <div className="flex items-cent gap-1"></div>
    </Shad.Pagination>
  );
};
export default Pagination;
