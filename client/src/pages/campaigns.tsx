import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/data-table";
import { Plus, Archive } from "lucide-react";
import { Campaign } from "@shared/schema";
import { CampaignDialog } from "@/components/campaign-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
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

  const handleArchive = (campaign: Campaign) => {
    if (confirm(`Are you sure you want to archive "${campaign.name}"?`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-campaigns-title">Properties</h1>
          <p className="text-muted-foreground">Manage property campaigns and track vendor forms</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-create-campaign">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      <DataTable
        columns={[
          { 
            header: "Address", 
            accessor: (row) => {
              // Priority: listingData.displayAddress > manualAddress > name
              if (row.listingData?.displayAddress) {
                return row.listingData.displayAddress;
              }
              if (row.manualAddress) {
                return row.manualAddress;
              }
              return row.name || "No address set";
            }
          },
          {
            header: "Status",
            accessor: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: "Listing",
            accessor: (row) => row.listingId ? `Cooper & Co #${row.listingId}` : "Manual",
          },
          {
            header: "Created",
            accessor: (row) => format(new Date(row.createdAt), "MMM d, yyyy"),
          },
        ]}
        data={campaigns || []}
        onRowClick={(campaign) => setLocation(`/campaigns/${campaign.id}/manage`)}
        actions={[
          {
            label: "Archive",
            onClick: handleArchive,
            variant: "destructive",
          },
        ]}
        emptyMessage="No properties yet. Add your first property to get started."
      />

      <CampaignDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
      />
    </div>
  );
}
