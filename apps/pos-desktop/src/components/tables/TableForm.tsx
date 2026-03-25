import type {
  CreateTableDto,
  TableWithFloor,
  UpdateTableDto,
} from "@/dto/tables.dto";
import {
  useLocalCreateTable,
  useLocalFloors,
  useLocalUpdateTable,
} from "@/hooks/offline";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { Button, InputField, SelectField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

interface TableFormProps {
  table?: TableWithFloor;
}

export function TableForm({ table }: TableFormProps) {
  const { branchId } = useBranchStore();
  const { closeModal } = useModalStore();
  const { floors = [] } = useLocalFloors(branchId ?? undefined);

  const createTableMutation = useLocalCreateTable();
  const updateTableMutation = useLocalUpdateTable();

  const handleTableSubmit = (data: CreateTableDto | UpdateTableDto) => {
    if (table) {
      updateTableMutation.mutate({
        id: table.id,
        data: data as UpdateTableDto,
      });
    } else {
      createTableMutation.mutate(data as CreateTableDto);
    }
  };

  const form = useForm({
    defaultValues: {
      tableNumber: table?.tableNumber?.toString() || "",
      name: table?.name || "",
      capacity: table?.capacity?.toString() || "4",
      floorId: table?.floorId || "",
    },
    onSubmit: async ({ value }) => {
      const data = table
        ? ({
            tableNumber: parseInt(value.tableNumber),
            name: value.name.trim(),
            capacity: parseInt(value.capacity),
            floorId: value.floorId.trim() !== "" ? value.floorId : null,
          } as UpdateTableDto)
        : ({
            tableNumber: parseInt(value.tableNumber),
            name: value.name.trim(),
            capacity: parseInt(value.capacity),
            branchId: branchId!,
            ...(value.floorId.trim() !== "" ? { floorId: value.floorId } : {}),
          } as CreateTableDto);
      handleTableSubmit(data);
    },
  });

  const isPending =
    createTableMutation.isPending || updateTableMutation.isPending;

  const floorOptions = floors.map((floor) => ({
    value: floor.id,
    label: floor.name,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <form.Field
          name="tableNumber"
          children={(field) => (
            <InputField
              label="Table Number"
              field={field}
              type="number"
              placeholder="e.g., 1"
              min="1"
              required
            />
          )}
        />

        <form.Field
          name="capacity"
          children={(field) => (
            <InputField
              label="Capacity"
              field={field}
              type="number"
              placeholder="e.g., 4"
              min="1"
              required
            />
          )}
        />
      </div>

      <form.Field
        name="name"
        children={(field) => (
          <InputField
            label="Table Name"
            field={field}
            placeholder="e.g., Window Table 1"
            required
          />
        )}
      />

      <form.Field
        name="floorId"
        children={(field) => (
          <SelectField
            label="Floor (Optional)"
            field={field}
            options={floorOptions}
            placeholder="Select a floor"
          />
        )}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} isSubmitting={isPending}>
          {table ? "Update Table" : "Create Table"}
        </Button>
      </div>
    </form>
  );
}
