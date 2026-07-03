"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { bulkImportProductsAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CsvRow = {
  title: string;
  sku: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
  brand: string;
  category: string;
  reorderLevel: string;
  description: string;
};

const editableColumns: Array<keyof CsvRow> = [
  "title",
  "sku",
  "costPrice",
  "sellingPrice",
  "quantity",
  "brand",
  "category",
  "reorderLevel",
  "description"
];

const requiredColumns = ["title", "costPrice", "sellingPrice", "quantity"];

function emptyRow(): CsvRow {
  return {
    title: "",
    sku: "",
    costPrice: "",
    sellingPrice: "",
    quantity: "",
    brand: "",
    category: "",
    reorderLevel: "5",
    description: ""
  };
}

function normalizeRow(row: Record<string, unknown>): CsvRow {
  return {
    title: String(row.title ?? ""),
    sku: String(row.sku ?? ""),
    costPrice: String(row.costPrice ?? ""),
    sellingPrice: String(row.sellingPrice ?? ""),
    quantity: String(row.quantity ?? ""),
    brand: String(row.brand ?? ""),
    category: String(row.category ?? ""),
    reorderLevel: String(row.reorderLevel ?? "5"),
    description: String(row.description ?? "")
  };
}

function downloadSampleCsv() {
  const csv = [
    "title,costPrice,sellingPrice,quantity,brand,category",
    "Bosch Drill,2500,3200,15,Bosch,Drill",
    "Makita Grinder,3000,4200,8,Makita,Grinder"
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mpt-sample-import.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CsvImportClient() {
  const router = useRouter();
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  const missingRequired = useMemo(
    () =>
      rows.some((row) =>
        requiredColumns.some((column) => !String(row[column as keyof CsvRow] ?? "").trim())
      ),
    [rows]
  );

  const parseFile = (file: File) => {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = result.meta.fields ?? [];
        const missing = requiredColumns.filter((column) => !fields.includes(column));

        if (missing.length) {
          toast.error(`CSV missing required columns: ${missing.join(", ")}`);
          return;
        }

        setRows(result.data.map(normalizeRow));
        toast.success(`${result.data.length} rows loaded for preview.`);
      },
      error: (error) => toast.error(error.message)
    });
  };

  const updateRow = (index: number, key: keyof CsvRow, value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value
            }
          : row
      )
    );
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);

  const importRows = () => {
    startTransition(async () => {
      const result = await bulkImportProductsAction(
        rows.map((row) => ({
          ...row,
          costPrice: Number(row.costPrice),
          sellingPrice: Number(row.sellingPrice),
          quantity: Number(row.quantity),
          reorderLevel: Number(row.reorderLevel || 5)
        }))
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/products");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 p-6 text-center transition-colors hover:bg-muted"
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                parseFile(file);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            <FileSpreadsheet className="mb-3 size-8 text-muted-foreground" />
            <span className="font-medium">{fileName || "Drop a CSV file or browse"}</span>
            <span className="mt-1 text-sm text-muted-foreground">
              Required: title, costPrice, sellingPrice, quantity. SKU is optional.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  parseFile(file);
                }
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadSampleCsv}>
              Download Sample
            </Button>
            <Button type="button" variant="outline" onClick={addRow}>
              Add Manual Row
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview and Edit Rows</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {editableColumns.map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      {editableColumns.map((column) => (
                        <TableCell key={column} className="min-w-36">
                          <Input value={row[column]} onChange={(event) => updateRow(index, column, event.target.value)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{rows.length} rows ready for validation and import.</p>
              <Button type="button" onClick={importRows} disabled={isPending || missingRequired}>
                {isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                Import Products
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
