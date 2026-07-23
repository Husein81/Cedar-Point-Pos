import { useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

type Props = {
  initialPage?: number;
  initialPageSize?: number;
};

export const usePagination = ({
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: Props) => {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");

  const onPageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const resetPage = () => setPage(1);

  return {
    page,
    setPage,
    pageSize,
    onPageSizeChange,
    searchQuery,
    setSearchQuery,
    resetPage,
  };
};
