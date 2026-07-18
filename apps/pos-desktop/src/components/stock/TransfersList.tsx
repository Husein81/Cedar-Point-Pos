import { transferColumns } from "@/components/stock/columns";
import { TransferForm } from "@/components/stock/TransferForm";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useTransfers } from "@/hooks/useTransfers";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";

export function TransfersList() {
  const { page, setPage, pageSize, onPageSizeChange } = usePaginationState({});

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
        onPageSizeChange,
      }}
    />
  );
}
