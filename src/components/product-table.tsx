"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import {
  ArrowDownUp,
  Download,
  Edit,
  PackageX,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

import {
  bulkDeleteProductsAction,
  bulkStockUpdateAction,
  deleteProductAction
} from "@/app/actions/products";
import { EmptyState } from "@/components/empty-state";
import { ProductIcon } from "@/components/product-icon";
import { StockBadge } from "@/components/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DisplaySettings, ProductRecord } from "@/lib/types";
import { cn, formatCurrency, getStockStatus, makeCsv } from "@/lib/utils";

function uniqueValues(products: ProductRecord[], key: "brand" | "category") {
  return Array.from(new Set(products.map((product) => product[key]).filter(Boolean) as string[])).sort();
}

function productMatchesSearch(product: ProductRecord, search: string) {
  const haystack = [product.title, product.sku, product.brand, product.category].filter(Boolean).join(" ").toLowerCase();

  return haystack.includes(search.toLowerCase());
}

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs uppercase" onClick={onClick}>
      {label}
      <ArrowDownUp className="size-3.5" />
    </Button>
  );
}

function ProductActions({
  product,
  onDelete,
  compact = false
}: {
  product: ProductRecord;
  onDelete: (product: ProductRecord) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", compact && "grid grid-cols-2")}>
      <Button asChild variant="outline" size="sm" className={cn(compact && "w-full")}>
        <Link href={`/products/${product.id}/edit`}>
          <Edit />
          Edit
        </Link>
      </Button>
      <Button
        type="button"
        variant="destructive"
        size={compact ? "sm" : "icon"}
        className={cn(compact ? "w-full" : "size-9")}
        onClick={() => onDelete(product)}
        aria-label={`Delete ${product.title}`}
      >
        <Trash2 />
        {compact ? "Delete" : <span className="sr-only">Delete</span>}
      </Button>
    </div>
  );
}

function ProductMobileCard({
  product,
  onDelete,
  displaySettings
}: {
  product: ProductRecord;
  onDelete: (product: ProductRecord) => void;
  displaySettings: DisplaySettings;
}) {
  const meta = [product.brand, product.category].filter(Boolean).join(" / ");
  const detailItems = [
    { label: "Qty", value: product.quantity },
    { label: "Sell", value: formatCurrency(product.sellingPrice) },
    ...(displaySettings.showCostPrice ? [{ label: "Cost", value: formatCurrency(product.costPrice) }] : []),
    ...(displaySettings.showMargin ? [{ label: "Margin", value: `${product.marginPercent}%` }] : [])
  ];

  return (
    <article className="rounded-lg border bg-card p-2.5">
      <div className="flex min-w-0 gap-2.5">
        <ProductIcon
          title={product.title}
          brand={product.brand}
          category={product.category}
          href={`/products/${product.id}`}
          className="size-12"
        />
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product.id}`} className="block break-words text-sm font-semibold leading-5 hover:text-primary">
            {product.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="max-w-full truncate">
              {product.sku}
            </Badge>
            {product.isMachine ? <Badge variant="success">Rentable machine</Badge> : null}
            <StockBadge quantity={product.quantity} reorderLevel={product.reorderLevel} />
          </div>
          {meta ? <p className="mt-2 break-words text-xs text-muted-foreground">{meta}</p> : null}
        </div>
      </div>

      <div
        className={cn(
          "mt-2.5 grid gap-1.5 rounded-md bg-muted/50 p-1.5 text-center",
          detailItems.length <= 2 ? "grid-cols-2" : detailItems.length === 3 ? "grid-cols-3" : "grid-cols-4"
        )}
      >
        {detailItems.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[11px] uppercase text-muted-foreground">{item.label}</p>
            <p className="truncate text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-2.5">
        <ProductActions product={product} onDelete={onDelete} compact />
      </div>
    </article>
  );
}

export function ProductTable({
  products,
  databaseReady,
  displaySettings
}: {
  products: ProductRecord[];
  databaseReady: boolean;
  displaySettings: DisplaySettings;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(products);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockMode, setStockMode] = useState<"add" | "reduce" | "set">("add");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setRows(products), [products]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (isTyping) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key.toLowerCase() === "n") {
        router.push("/products/new");
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const brands = useMemo(() => uniqueValues(rows, "brand"), [rows]);
  const categories = useMemo(() => uniqueValues(rows, "category"), [rows]);

  const filteredProducts = useMemo(
    () =>
      rows.filter((product) => {
        const matchesSearch = !search || productMatchesSearch(product, search);
        const matchesBrand = brand === "all" || product.brand === brand;
        const matchesCategory = category === "all" || product.category === category;
        const status = getStockStatus(product.quantity, product.reorderLevel);
        const matchesStatus = stockStatus === "all" || status === stockStatus;

        return matchesSearch && matchesBrand && matchesCategory && matchesStatus;
      }),
    [brand, category, rows, search, stockStatus]
  );

  const columns = useMemo<ColumnDef<ProductRecord>[]>(() => {
    const tableColumns: ColumnDef<ProductRecord>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label="Select row"
          />
        ),
        enableSorting: false
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <ProductIcon
            title={row.original.title}
            brand={row.original.brand}
            category={row.original.category}
            href={`/products/${row.original.id}`}
          />
        ),
        enableSorting: false
      },
      {
        accessorKey: "title",
        header: ({ column }) => <SortButton label="Product" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
        cell: ({ row }) => (
          <div className="min-w-64">
            <Link href={`/products/${row.original.id}`} className="font-medium text-foreground hover:text-primary">
              {row.original.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{row.original.sku}</Badge>
              {row.original.isMachine ? <Badge variant="success">Rentable machine</Badge> : null}
              {row.original.brand ? <span className="text-xs text-muted-foreground">{row.original.brand}</span> : null}
              {row.original.category ? <span className="text-xs text-muted-foreground">/ {row.original.category}</span> : null}
            </div>
          </div>
        )
      }
    ];

    if (displaySettings.showCostPrice) {
      tableColumns.push({
        accessorKey: "costPrice",
        header: ({ column }) => <SortButton label="Cost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
        cell: ({ row }) => formatCurrency(row.original.costPrice)
      });
    }

    tableColumns.push({
      accessorKey: "sellingPrice",
      header: ({ column }) => <SortButton label="Sell" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.sellingPrice)}</span>
    });

    if (displaySettings.showMargin) {
      tableColumns.push({
        accessorKey: "marginPercent",
        header: ({ column }) => <SortButton label="Margin" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
        cell: ({ row }) => `${row.original.marginPercent}%`
      });
    }

    tableColumns.push(
      {
        accessorKey: "quantity",
        header: ({ column }) => <SortButton label="Qty" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.quantity}</span>
            <StockBadge quantity={row.original.quantity} reorderLevel={row.original.reorderLevel} />
          </div>
        )
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <ProductActions product={row.original} onDelete={setDeleteTarget} />,
        enableSorting: false
      }
    );

    return tableColumns;
  }, [displaySettings.showCostPrice, displaySettings.showMargin]);

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: {
      sorting,
      rowSelection
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const selectedProducts = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const pageRows = table.getRowModel().rows;
  const activeFilterCount = [brand !== "all", category !== "all", stockStatus !== "all"].filter(Boolean).length;

  const deleteOne = () => {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setRows((current) => current.filter((product) => product.id !== target.id));
    setDeleteTarget(null);
    startTransition(async () => {
      const result = await deleteProductAction(target.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
        router.refresh();
      }
    });
  };

  const deleteBulk = () => {
    const ids = selectedProducts.map((product) => product.id);
    setRows((current) => current.filter((product) => !ids.includes(product.id)));
    setRowSelection({});
    setBulkDeleteOpen(false);
    startTransition(async () => {
      const result = await bulkDeleteProductsAction(ids);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
        router.refresh();
      }
    });
  };

  const updateBulkStock = () => {
    const ids = selectedProducts.map((product) => product.id);
    setRows((current) =>
      current.map((product) => {
        if (!ids.includes(product.id)) {
          return product;
        }

        const quantity =
          stockMode === "set"
            ? stockQuantity
            : stockMode === "add"
              ? product.quantity + stockQuantity
              : Math.max(0, product.quantity - stockQuantity);

        return {
          ...product,
          quantity
        };
      })
    );
    setStockDialogOpen(false);
    startTransition(async () => {
      const result = await bulkStockUpdateAction({
        productIds: ids,
        mode: stockMode,
        quantity: stockQuantity
      });
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
        router.refresh();
      }
    });
  };

  const exportFilteredRows = () => {
    const exportRows = table.getFilteredRowModel().rows.map((row) => row.original);
    const csv = makeCsv(exportRows, [
      "title",
      "sku",
      "brand",
      "category",
      "costPrice",
      "sellingPrice",
      "marginPercent",
      "quantity",
      "description"
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mpt-products.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!rows.length) {
    return (
      <EmptyState
        icon={PackageX}
        title="No products yet"
        description="Create the first inventory item or import a CSV to start tracking stock."
        action={
          <Button asChild>
            <Link href="/products/new">
              <Plus />
              New Product
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="rounded-lg border bg-card p-2 sm:p-3">
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_180px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 pl-9 lg:h-10"
              placeholder="Search products"
            />
          </div>

          <div className={cn("grid gap-2", filtersOpen ? "grid" : "hidden", "lg:contents")}>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-9 lg:h-10">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {brands.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 lg:h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockStatus} onValueChange={setStockStatus}>
              <SelectTrigger className="h-9 lg:h-10">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="healthy">In stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:contents">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full lg:hidden"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal />
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </Button>
            <Button type="button" variant="outline" size="sm" className="w-full lg:h-10 lg:w-auto" onClick={exportFilteredRows}>
              <Download />
              Export
            </Button>
          </div>
        </div>
      </div>

      {selectedProducts.length ? (
        <div className="hidden flex-col gap-2 rounded-lg border bg-muted/40 p-3 md:flex md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium">{selectedProducts.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStockDialogOpen(true)}>
              <RefreshCcw />
              Stock Update
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2.5 md:hidden">
        {pageRows.length ? (
          pageRows.map((row) => (
            <ProductMobileCard
              key={row.id}
              product={row.original}
              onDelete={setDeleteTarget}
              displaySettings={displaySettings}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No products match the current filters.
          </div>
        )}
      </div>

      <div className={cn("hidden min-w-0 overflow-hidden rounded-lg border bg-card md:block", !databaseReady && "border-amber-200 dark:border-amber-900")}>
        <Table className="min-w-[900px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                  No products match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {pageRows.length} of {filteredProducts.length} products
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              This removes {deleteTarget?.title}. Inventory activity will keep a deletion log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={deleteOne} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Products</DialogTitle>
            <DialogDescription>
              This removes {selectedProducts.length} selected products and records a bulk deletion log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={deleteBulk} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Stock Update</DialogTitle>
            <DialogDescription>Apply the same stock change to selected products.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select value={stockMode} onValueChange={(value) => setStockMode(value as "add" | "reduce" | "set")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add stock</SelectItem>
                  <SelectItem value="reduce">Reduce stock</SelectItem>
                  <SelectItem value="set">Set quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stockQuantity">Quantity</Label>
              <Input
                id="stockQuantity"
                type="number"
                min={0}
                value={stockQuantity}
                onChange={(event) => setStockQuantity(Number(event.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={updateBulkStock} disabled={isPending}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
