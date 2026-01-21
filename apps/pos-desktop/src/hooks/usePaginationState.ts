import { useState } from "react";

export const usePaginationState = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const onPageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    onPageSizeChange,
    searchQuery,
    setSearchQuery,
  };
};
