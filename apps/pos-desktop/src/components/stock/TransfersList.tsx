import { useState } from "react";
import { useTransfers } from "@/hooks/useTransfers";
import { useModalStore } from "@/store/modalStore";
import { DataTable, Button } from "@repo/ui";
import { transferColumns } from "@/constants/columns/transferColumn";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { TransferForm } from "@/components/stock/TransferForm";

export function TransfersList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { openModal } = useModalStore();

  const {
    data: response,
    isLoading,
    refetch,
  } = useTransfers({
    page: String(page),
    limit: String(pageSize),
  });

  const transfers = response?.data ?? [];
  const totalRows = response?.pagination?.totalCount ?? 0;
  const totalPages = response?.pagination?.totalPages ?? 1;

  const handleNewTransfer = () => {
    openModal(
      "New Transfer",
      <TransferForm />,
      "Transfer inventory products to another branch",
    );
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <DataTable
      columns={transferColumns}
      data={transfers}
      isLoading={isLoading}
      onRefetch={refetch}
      actions={
        <Button onClick={handleNewTransfer} iconName="ArrowLeftRight">
          New Transfer
        </Button>
      }
      pagination={{
        rows: totalRows,
        page,
        pageSize,
        totalPages,
        onPageChange: setPage,
        onPageSizeChange: handlePageSizeChange,
      }}
    />
  );
}
