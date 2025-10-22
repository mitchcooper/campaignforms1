import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/data-table";
import { Plus, Pencil, Archive } from "lucide-react";
import { Campaign } from "@shared/schema";
import { CampaignDialog } from "@/components/campaign-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign archived",
        description: "The campaign has been archived successfully.",
      });
    },
  });

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsDialogOpen(true);
  };

  const handleArchive = (campaign: Campaign) => {
    if (confirm(`Are you sure you want to archive "${campaign.name}"?`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCampaign(null);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-campaigns-title">Campaigns</h1>
          <p className="text-muted-foreground">Manage your vendor campaigns and track their status</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-create-campaign">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <DataTable
        columns={[
          { header: "Name", accessor: "name" },
          {
            header: "Status",
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: "Start Date",
            accessor: (row) => row.startDate ? format(new Date(row.startDate), "MMM d, yyyy") : "—",
          },
          {
            header: "End Date",
            accessor: (row) => row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—",
          },
          {
            header: "Created",
            accessor: (row) => format(new Date(row.createdAt), "MMM d, yyyy"),
          },
        ]}
        data={campaigns || []}
        actions={[
          {
            label: "Edit",
            onClick: handleEdit,
          },
          {
            label: "Archive",
            onClick: handleArchive,
            variant: "destructive",
          },
        ]}
        emptyMessage="No campaigns yet. Create your first campaign to get started."
      />

      <CampaignDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        campaign={editingCampaign}
      />
    </div>
  );
}
