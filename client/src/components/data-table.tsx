import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  align?: "left" | "right" | "center";
  className?: string;
}

export interface Action<T> {
  label: string | ((row: T) => string);
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  actions?: Action<T>[];
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id: string }>({ columns, data, actions, emptyMessage = "No data available", className }: DataTableProps<T>) {
  return (
    <div className={className}>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={`font-semibold text-foreground ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"} ${column.className || ""}`}
                >
                  {column.header}
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="w-12"></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30" data-testid={`row-${row.id}`}>
                  {columns.map((column, index) => (
                    <TableCell
                      key={index}
                      className={`${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"} ${column.className || ""}`}
                    >
                      {typeof column.accessor === "function"
                        ? column.accessor(row)
                        : String(row[column.accessor] || "")}
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, actionIndex) => {
                            const label = typeof action.label === "function" ? action.label(row) : action.label;
                            return (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={() => action.onClick(row)}
                                className={action.variant === "destructive" ? "text-destructive" : ""}
                                data-testid={`action-${label.toLowerCase().replace(/\s+/g, '-')}-${row.id}`}
                              >
                                {label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; className: string }> = {
    draft: { variant: "secondary", className: "bg-secondary text-secondary-foreground" },
    active: { variant: "default", className: "bg-[hsl(195,100%,47%)] text-white hover:bg-[hsl(195,100%,47%)]/90" },
    archived: { variant: "outline", className: "bg-muted text-muted-foreground" },
    submitted: { variant: "default", className: "bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,45%)]/90" },
  };

  const config = variants[status.toLowerCase()] || variants.draft;

  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  );
}
