import { useState } from "react";

type Props = {
  initialPage?: number;
  initialPageSize?: number;
};

export const usePaginationState = ({
  initialPage = 1,
  initialPageSize = 10,
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
