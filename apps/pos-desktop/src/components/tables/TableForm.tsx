import { useState, useEffect } from "react";
import { Button, Shad, Icon, Input, Label } from "@repo/ui";
import type {
    CreateTableDto,
    UpdateTableDto,
    TableWithFloor,
} from "@/dto/tables.dto";
import { useBranchStore } from "@/store/branchStore";
import { useFloorsByBranch } from "@/hooks/useFloor";

interface TableFormProps {
    table?: TableWithFloor | null;
    onSubmit: (data: CreateTableDto | UpdateTableDto) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function TableForm({
    table,
    onSubmit,
    onCancel,
    isSubmitting,
}: TableFormProps) {
    const { branchId } = useBranchStore();
    const { data: floors = [] } = useFloorsByBranch();

    const [formData, setFormData] = useState({
        tableNumber: table?.tableNumber?.toString() || "",
        name: table?.name || "",
        capacity: table?.capacity?.toString() || "4",
        floorId: table?.floorId || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (table) {
            setFormData({
                tableNumber: table.tableNumber?.toString() || "",
                name: table.name || "",
                capacity: table.capacity?.toString() || "4",
                floorId: table.floorId || "",
            });
        }
    }, [table]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        const tableNum = parseInt(formData.tableNumber);
        if (!formData.tableNumber || isNaN(tableNum) || tableNum < 1) {
            newErrors.tableNumber = "Table number must be a positive integer (numbers only)";
        }

        if (!formData.name.trim()) {
            newErrors.name = "Table name is required";
        }

        const capacityNum = parseInt(formData.capacity);
        if (!formData.capacity || isNaN(capacityNum) || capacityNum < 1) {
            newErrors.capacity = "Capacity must be at least 1";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        const data = table
            ? ({
                tableNumber: parseInt(formData.tableNumber),
                name: formData.name.trim(),
                capacity: parseInt(formData.capacity),
                // For updates: send null if no floor, otherwise send the floor ID
                floorId: formData.floorId.trim() !== "" ? formData.floorId : null,
            } as UpdateTableDto)
            : ({
                tableNumber: parseInt(formData.tableNumber),
                name: formData.name.trim(),
                capacity: parseInt(formData.capacity),
                branchId: branchId!,
                // For creates: only include floorId if actually selected
                ...(formData.floorId.trim() !== "" ? { floorId: formData.floorId } : {}),
            } as CreateTableDto);

        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="tableNumber">Table Number *</Label>
                    <Input
                        id="tableNumber"
                        type="number"
                        min="1"
                        placeholder="e.g., 1"
                        value={formData.tableNumber}
                        onChange={(e) =>
                            setFormData({ ...formData, tableNumber: e.target.value })
                        }
                        className={errors.tableNumber ? "border-red-500" : ""}
                    />
                    {errors.tableNumber && (
                        <p className="text-sm text-red-500">{errors.tableNumber}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity *</Label>
                    <Input
                        id="capacity"
                        type="number"
                        min="1"
                        placeholder="e.g., 4"
                        value={formData.capacity}
                        onChange={(e) =>
                            setFormData({ ...formData, capacity: e.target.value })
                        }
                        className={errors.capacity ? "border-red-500" : ""}
                    />
                    {errors.capacity && (
                        <p className="text-sm text-red-500">{errors.capacity}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Table Name *</Label>
                <Input
                    id="name"
                    placeholder="e.g., Window Table 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="floorId">Floor (Optional)</Label>
                <Shad.Select
                    value={formData.floorId}
                    onValueChange={(value) =>
                        setFormData({ ...formData, floorId: value === "none" ? "" : value })
                    }
                >
                    <Shad.SelectTrigger>
                        <Shad.SelectValue placeholder="Select a floor" />
                    </Shad.SelectTrigger>
                    <Shad.SelectContent>
                        <Shad.SelectItem value="none">No floor assigned</Shad.SelectItem>
                        {floors.map((floor) => (
                            <Shad.SelectItem key={floor.id} value={floor.id}>
                                <div className="flex items-center gap-2">
                                    <Icon name="Building2" className="h-4 w-4" />
                                    {floor.name}
                                </div>
                            </Shad.SelectItem>
                        ))}
                    </Shad.SelectContent>
                </Shad.Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                        <Icon name="LoaderCircle" className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {table ? "Update Table" : "Create Table"}
                </Button>
            </div>
        </form>
    );
}
