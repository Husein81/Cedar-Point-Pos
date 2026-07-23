// Reusable named-color palette, picked when setting a category's color.

import type { Color } from "../../shared/models";
import type { ColorInput } from "../../shared/schemas";
import type { ColorRepository } from "../repositories/color.repository";
import { ConflictError, NotFoundError } from "../core/errors";
import { newId, nowIso } from "../core/id";

// Mirrors pos-desktop's default palette (Tailwind-ish named hues).
const DEFAULT_COLORS: Array<{ name: string; hex: string }> = [
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Green", hex: "#22C55E" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Fuchsia", hex: "#D946EF" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Slate", hex: "#64748B" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Zinc", hex: "#71717A" },
  { name: "Neutral", hex: "#737373" },
  { name: "Stone", hex: "#78716C" },
];

export class ColorsService {
  constructor(private readonly colors: ColorRepository) {}

  list(): Color[] {
    return this.colors.list();
  }

  create(input: ColorInput): Color {
    if (this.colors.findByName(input.name)) {
      throw new ConflictError(
        `A color named "${input.name}" already exists`,
        "COLOR_NAME_TAKEN",
      );
    }

    const now = nowIso();
    const color: Color = {
      id: newId(),
      name: input.name,
      hex: input.hex,
      createdAt: now,
      updatedAt: now,
    };
    this.colors.insert(color);
    return color;
  }

  update(id: string, input: ColorInput): Color {
    const existing = this.colors.findById(id);
    if (!existing) throw new NotFoundError("Color");

    const nameOwner = this.colors.findByName(input.name);
    if (nameOwner && nameOwner.id !== id) {
      throw new ConflictError(
        `A color named "${input.name}" already exists`,
        "COLOR_NAME_TAKEN",
      );
    }

    const next: Color = {
      ...existing,
      name: input.name,
      hex: input.hex,
      updatedAt: nowIso(),
    };
    this.colors.update(next);
    return next;
  }

  delete(id: string): void {
    const existing = this.colors.findById(id);
    if (!existing) throw new NotFoundError("Color");
    this.colors.delete(id);
  }

  seedDefaults(): { inserted: number } {
    const now = nowIso();
    const rows: Color[] = DEFAULT_COLORS.map((entry) => ({
      id: newId(),
      name: entry.name,
      hex: entry.hex,
      createdAt: now,
      updatedAt: now,
    }));
    const inserted = this.colors.insertMany(rows);
    return { inserted };
  }
}
