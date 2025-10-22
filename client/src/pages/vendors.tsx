import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Plus, Link as LinkIcon } from "lucide-react";
import { Vendor } from "@shared/schema";
import { VendorDialog } from "@/components/vendor-dialog";
import { LinkDialog } from "@/components/link-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Vendors() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: allVendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const vendors = allVendors?.filter(v => 
    campaignFilter === "all" || v.campaignId === campaignFilter
  );

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Vendor deleted",
        description: "The vendor has been deleted successfully.",
      });
    },
  });

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsDialogOpen(true);
  };

  const handleDelete = (vendor: Vendor) => {
    if (confirm(`Are you sure you want to delete "${vendor.name}"?`)) {
      deleteMutation.mutate(vendor.id);
    }
  };

  const handleIssueLink = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsLinkDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingVendor(null);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-vendors-title">Vendors</h1>
          <p className="text-muted-foreground">Manage vendor contacts and send form links</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-create-vendor">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[240px]" data-testid="select-campaign-filter">
            <SelectValue placeholder="Filter by campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns?.map((campaign: any) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Email", accessor: (row) => row.email || "—" },
          { header: "Phone", accessor: (row) => row.phone || "—" },
          {
            header: "Campaign",
            accessor: (row) => {
              const campaign = campaigns?.find((c: any) => c.id === row.campaignId);
              return campaign?.name || "—";
            },
          },
        ]}
        data={vendors || []}
        actions={[
          {
            label: "Issue Form Link",
            onClick: handleIssueLink,
          },
          {
            label: "Edit",
            onClick: handleEdit,
          },
          {
            label: "Delete",
            onClick: handleDelete,
            variant: "destructive",
          },
        ]}
        emptyMessage="No vendors yet. Add your first vendor to get started."
      />

      <VendorDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        vendor={editingVendor}
      />

      <LinkDialog
        open={isLinkDialogOpen}
        onClose={() => {
          setIsLinkDialogOpen(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
      />
    </div>
  );
}
