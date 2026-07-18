"use client";

import { useState, useMemo, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ""), obj);
}

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchFields: string[];
  pageSize?: number;
  emptyMessage?: string;
  showInactiveToggle?: boolean;
  renderMobileCard?: (item: T) => ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchFields,
  pageSize = 20,
  emptyMessage = "Aucun résultat",
  showInactiveToggle,
  renderMobileCard,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = getNestedValue(item, field);
          return val && val.toString().toLowerCase().includes(q);
        })
      );
    }

    if (showInactiveToggle && !showInactive) {
      result = result.filter((item: any) => item.is_active !== false);
    }

    return result;
  }, [data, search, searchFields, showInactiveToggle, showInactive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 max-w-sm"
        />
      </div>

      {showInactiveToggle && (
        <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Afficher les comptes inactifs
        </label>
      )}

      {renderMobileCard && (
        <div className="md:hidden flex flex-col gap-3" data-mobile-cards>
          {paged.length > 0 ? (
            paged.map((item, i) => (
              <div key={item.id || i}>{renderMobileCard(item)}</div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">{emptyMessage}</div>
          )}
        </div>
      )}

      <div className={`${renderMobileCard ? "hidden md:block" : ""} overflow-x-auto rounded-md border`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th key={col.key} className={`text-left py-3 px-4 font-semibold ${col.className || ""}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? (
              paged.map((item, i) => (
                <tr key={item.id || i} className="border-b hover:bg-muted/50">
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 ${col.className || ""}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            {search && ` pour "${search}"`}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }}
                  className={safePage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {(() => {
                const pages: (number | "...")[] = [];
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= safePage - 1 && i <= safePage + 1)) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== "...") {
                    pages.push("...");
                  }
                }
                return pages.map((p, idx) =>
                  p === "..." ? (
                    <PaginationItem key={`e${idx}`}>
                      <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">...</span>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === safePage}
                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                );
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)); }}
                  className={safePage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

interface SearchableGridProps<T> {
  data: T[];
  searchFields: string[];
  pageSize?: number;
  emptyMessage?: string;
  renderItem: (item: T) => ReactNode;
  gridCols?: string;
  showInactiveToggle?: boolean;
}

export function SearchableGrid<T extends Record<string, any>>({
  data,
  searchFields,
  pageSize = 20,
  emptyMessage = "Aucun résultat",
  renderItem,
  gridCols = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  showInactiveToggle,
}: SearchableGridProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = getNestedValue(item, field);
          return val && val.toString().toLowerCase().includes(q);
        })
      );
    }

    if (showInactiveToggle && !showInactive) {
      result = result.filter((item: any) => item.is_active !== false);
    }

    return result;
  }, [data, search, searchFields, showInactiveToggle, showInactive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 max-w-sm"
        />
      </div>

      {showInactiveToggle && (
        <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Afficher les comptes inactifs
        </label>
      )}

      {paged.length > 0 ? (
        <div className={gridCols}>
          {paged.map((item) => (
            <span key={item.id}>{renderItem(item)}</span>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">{emptyMessage}</div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            {search && ` pour "${search}"`}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }}
                  className={safePage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {(() => {
                const pages: (number | "...")[] = [];
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= safePage - 1 && i <= safePage + 1)) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== "...") {
                    pages.push("...");
                  }
                }
                return pages.map((p, idx) =>
                  p === "..." ? (
                    <PaginationItem key={`e${idx}`}>
                      <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">...</span>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === safePage}
                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                );
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)); }}
                  className={safePage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
