import { useModalStore } from "@/store/modalStore";
import { Badge, Button, Shad } from "@repo/ui";
import { Download, FileUp, Upload } from "lucide-react";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";

/**
 * Minimal result contract every bulk-import endpoint returns. Entity results
 * (e.g. products) may carry extra fields (productId); only these are rendered.
 */
export type BulkImportRowStatus = "created" | "skipped" | "error";

export type BulkImportRowResult = {
  row: number;
  status: BulkImportRowStatus;
  message?: string;
};

export type BulkImportResult = {
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  results: BulkImportRowResult[];
};

export type BulkImportColumn = {
  key: string;
  label: string;
  required?: boolean;
};

type ParsedRow<T> =
  | { valid: true; rowNumber: number; data: T }
  | { valid: false; rowNumber: number; error: string };

type Props<T> = {
  /** Column contract, drives the template header and the required-field hints. */
  columns: BulkImportColumn[];
  /** Validate/transform one raw CSV record into a typed row, or reject it. */
  parseRow: (raw: Record<string, string>) => { data: T } | { error: string };
  /** Submit the valid rows; resolves to the backend's per-row result summary. */
  onSubmit: (rows: T[]) => Promise<BulkImportResult>;
  /** Optional example values used as a second line in the downloadable template. */
  sampleRow?: Record<string, string>;
};

const STATUS_VARIANT: Record<
  BulkImportRowStatus,
  "default" | "secondary" | "destructive"
> = {
  created: "default",
  skipped: "secondary",
  error: "destructive",
};

const CONTENT_WIDTH = "w-full space-y-4";

/** Client-side ceiling; mirrors the API's BULK_IMPORT_MAX_ROWS. */
const MAX_ROWS = 1000;

export function BulkImportModal<T>({
  columns,
  parseRow,
  onSubmit,
  sampleRow,
}: Props<T>) {
  const closeModal = useModalStore((state) => state.closeModal);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow<T>[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const validRows = useMemo(
    () => parsedRows.filter((r): r is Extract<ParsedRow<T>, { valid: true }> => r.valid),
    [parsedRows],
  );
  const invalidCount = parsedRows.length - validRows.length;

  const handleFile = (file: File) => {
    setResult(null);
    setFileError(null);
    setParsedRows([]);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      error: (err) => {
        setFileError(`Could not read the file: ${err.message}`);
      },
      complete: (parsed) => {
        if (parsed.errors.length > 0) {
          setFileError(
            `Could not parse the CSV: ${parsed.errors[0]?.message ?? "unknown error"}`,
          );
          return;
        }
        if (parsed.data.length > MAX_ROWS) {
          setFileError(
            `File has ${parsed.data.length} rows; the limit is ${MAX_ROWS}. Split it into smaller files.`,
          );
          return;
        }
        const rows = parsed.data.map((raw, index): ParsedRow<T> => {
          const rowNumber = index + 1;
          const outcome = parseRow(raw);
          if ("error" in outcome) {
            return { valid: false, rowNumber, error: outcome.error };
          }
          return { valid: true, rowNumber, data: outcome.data };
        });
        setParsedRows(rows);
      },
    });
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await onSubmit(validRows.map((r) => r.data));
      setResult(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const header = columns.map((c) => c.key).join(",");
    const sample = sampleRow
      ? columns.map((c) => escapeCsv(sampleRow[c.key] ?? "")).join(",")
      : "";
    const csv = sample ? `${header}\n${sample}` : header;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Post-submit view: per-row result summary.
  if (result) {
    return (
      <div className={CONTENT_WIDTH}>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">{result.createdCount} created</Badge>
          <Badge variant="secondary">{result.skippedCount} skipped</Badge>
          <Badge variant="destructive">{result.errorCount} failed</Badge>
        </div>
        <div className="max-h-72 w-full overflow-auto rounded-md border">
          <Shad.Table>
            <Shad.TableHeader>
              <Shad.TableRow>
                <Shad.TableHead className="w-16">Row</Shad.TableHead>
                <Shad.TableHead className="w-28">Status</Shad.TableHead>
                <Shad.TableHead>Detail</Shad.TableHead>
              </Shad.TableRow>
            </Shad.TableHeader>
            <Shad.TableBody>
              {result.results.map((r) => (
                <Shad.TableRow key={r.row}>
                  <Shad.TableCell>{r.row}</Shad.TableCell>
                  <Shad.TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </Shad.TableCell>
                  <Shad.TableCell className="text-sm text-muted-foreground">
                    {r.message ?? "—"}
                  </Shad.TableCell>
                </Shad.TableRow>
              ))}
            </Shad.TableBody>
          </Shad.Table>
        </div>
        <div className="flex justify-end">
          <Button onClick={closeModal}>Done</Button>
        </div>
      </div>
    );
  }

  // Pre-submit view: upload + preview.
  return (
    <div className={CONTENT_WIDTH}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Upload a CSV file. Required columns:{" "}
          {columns
            .filter((c) => c.required)
            .map((c) => c.key)
            .join(", ") || "none"}
          .
        </p>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Template
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => fileInputRef.current?.click()}
      >
        <FileUp className="mr-2 h-4 w-4" />
        {fileName ?? "Choose CSV file"}
      </Button>

      {fileError && (
        <p className="text-sm text-destructive" role="alert">
          {fileError}
        </p>
      )}

      {parsedRows.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">{validRows.length} valid</Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive">{invalidCount} invalid</Badge>
            )}
          </div>
          <div className="max-h-72 w-full overflow-auto rounded-md border">
            <Shad.Table>
              <Shad.TableHeader>
                <Shad.TableRow>
                  <Shad.TableHead className="w-16">Row</Shad.TableHead>
                  {columns.map((c) => (
                    <Shad.TableHead key={c.key} className="whitespace-nowrap">
                      {c.label}
                    </Shad.TableHead>
                  ))}
                </Shad.TableRow>
              </Shad.TableHeader>
              <Shad.TableBody>
                {parsedRows.map((row) => (
                  <Shad.TableRow
                    key={row.rowNumber}
                    className={row.valid ? undefined : "bg-destructive/10"}
                  >
                    <Shad.TableCell>{row.rowNumber}</Shad.TableCell>
                    {row.valid ? (
                      columns.map((c) => (
                        <Shad.TableCell
                          key={c.key}
                          className="whitespace-nowrap text-sm"
                        >
                          {formatCell(
                            (row.data as Record<string, unknown>)[c.key],
                          )}
                        </Shad.TableCell>
                      ))
                    ) : (
                      <Shad.TableCell
                        colSpan={columns.length}
                        className="text-sm text-destructive"
                      >
                        {row.error}
                      </Shad.TableCell>
                    )}
                  </Shad.TableRow>
                ))}
              </Shad.TableBody>
            </Shad.Table>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={validRows.length === 0 || isSubmitting}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isSubmitting
            ? "Importing…"
            : `Import ${validRows.length} row${validRows.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
