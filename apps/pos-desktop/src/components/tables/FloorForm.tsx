import { useState, useEffect } from "react";
import { Button, Icon, Input, Label } from "@repo/ui";
import type {
    CreateFloorDto,
    UpdateFloorDto,
    FloorWithTableCount,
} from "@/dto/tables.dto";
import { useBranchStore } from "@/store/branchStore";

interface FloorFormProps {
    floor?: FloorWithTableCount | null;
    onSubmit: (data: CreateFloorDto | UpdateFloorDto) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isSubmitting?: boolean;
}

export function FloorForm({
    floor,
    onSubmit,
    onCancel,
    onDelete,
    isSubmitting,
}: FloorFormProps) {
    const { branchId } = useBranchStore();

    const [formData, setFormData] = useState({
        name: floor?.name || "",
        order: floor?.order?.toString() || "0",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (floor) {
            setFormData({
                name: floor.name || "",
                order: floor.order?.toString() || "0",
            });
        }
    }, [floor]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Floor name is required";
        }

        if (formData.order && parseInt(formData.order) < 0) {
            newErrors.order = "Order must be a non-negative number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        const data = floor
            ? ({
                name: formData.name.trim(),
                order: parseInt(formData.order) || 0,
            } as UpdateFloorDto)
            : ({
                name: formData.name.trim(),
                order: parseInt(formData.order) || 0,
                branchId: branchId!,
            } as CreateFloorDto);

        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="floorName">Floor Name *</Label>
                <Input
                    id="floorName"
                    placeholder="e.g., Ground Floor, Terrace, VIP Section"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                    id="order"
                    type="number"
                    min="0"
                    placeholder="e.g., 0"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className={errors.order ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                    Lower numbers appear first in the floor tabs
                </p>
                {errors.order && <p className="text-sm text-red-500">{errors.order}</p>}
            </div>

            <div className="flex justify-between gap-2 pt-4">
                <div>                    {floor && onDelete && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onDelete}
                        disabled={isSubmitting}
                    >
                        <Icon name="Trash2" className="mr-2 h-4 w-4" />
                        Delete Floor
                    </Button>
                )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && (
                            <Icon name="LoaderCircle" className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {floor ? "Update Floor" : "Create Floor"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
