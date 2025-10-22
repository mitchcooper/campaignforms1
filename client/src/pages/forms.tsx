import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/data-table";
import { Plus, Edit } from "lucide-react";
import { Form as FormType } from "@shared/schema";
import { FormDialog } from "@/components/form-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Forms() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormType | null>(null);
  const { toast } = useToast();

  const { data: forms, isLoading } = useQuery<FormType[]>({
    queryKey: ["/api/forms"],
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/forms/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form updated",
        description: "Form status has been updated successfully.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/forms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form deleted",
        description: "The form has been deleted successfully.",
      });
    },
  });

  const handleEdit = (form: FormType) => {
    setLocation(`/forms/${form.id}/builder`);
  };

  const handleToggleActive = (form: FormType) => {
    toggleActiveMutation.mutate({ id: form.id, isActive: !form.isActive });
  };

  const handleDelete = (form: FormType) => {
    if (confirm(`Are you sure you want to delete "${form.title}"?`)) {
      deleteMutation.mutate(form.id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingForm(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-forms-title">Forms</h1>
          <p className="text-muted-foreground">Design and manage global form templates available to all campaigns</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-create-form">
          <Plus className="h-4 w-4" />
          Create Form
        </Button>
      </div>

      <DataTable
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Description", accessor: (row) => row.description || "—" },
          {
            header: "Status",
            accessor: (row) => (
              <Badge variant={row.isActive ? "default" : "secondary"} className={row.isActive ? "bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,45%)]/90" : ""}>
                {row.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          { header: "Version", accessor: (row) => `v${row.version}` },
          {
            header: "Created",
            accessor: (row) => format(new Date(row.createdAt), "MMM d, yyyy"),
          },
        ]}
        data={forms || []}
        actions={[
          {
            label: "Edit in Builder",
            onClick: handleEdit,
          },
          {
            label: (row) => row.isActive ? "Deactivate" : "Activate",
            onClick: handleToggleActive,
          },
          {
            label: "Delete",
            onClick: handleDelete,
            variant: "destructive",
          },
        ]}
        emptyMessage="No forms yet. Create your first form to get started."
      />

      <FormDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        form={editingForm}
      />
    </div>
  );
}
