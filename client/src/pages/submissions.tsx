import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { Submission } from "@shared/schema";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Submissions() {
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const queryParams = new URLSearchParams();
  if (campaignFilter !== "all") queryParams.set("campaignId", campaignFilter);
  if (formFilter !== "all") queryParams.set("formId", formFilter);

  const { data: submissions, isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", Object.fromEntries(queryParams)],
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: forms } = useQuery({
    queryKey: ["/api/forms"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const handleViewData = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-submissions-title">Submissions</h1>
        <p className="text-muted-foreground">View and manage form submissions from vendors</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-campaign-filter">
            <SelectValue placeholder="All campaigns" />
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

        <Select value={formFilter} onValueChange={setFormFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-form-filter">
            <SelectValue placeholder="All forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            {forms?.map((form: any) => (
              <SelectItem key={form.id} value={form.id}>
                {form.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          {
            header: "Submitted",
            accessor: (row) => format(new Date(row.createdAt), "MMM d, yyyy h:mm a"),
          },
          {
            header: "Form",
            accessor: (row) => {
              const form = forms?.find((f: any) => f.id === row.formId);
              return form?.title || "—";
            },
          },
          {
            header: "Campaign",
            accessor: (row) => {
              const campaign = campaigns?.find((c: any) => c.id === row.campaignId);
              return campaign?.name || "—";
            },
          },
          {
            header: "Vendor",
            accessor: (row) => {
              if (!row.vendorId) return "—";
              const vendor = vendors?.find((v: any) => v.id === row.vendorId);
              return vendor?.name || "—";
            },
          },
          {
            header: "Data Preview",
            accessor: (row) => {
              const dataStr = JSON.stringify(row.data);
              return (
                <span className="font-mono text-xs text-muted-foreground">
                  {dataStr.substring(0, 50)}...
                </span>
              );
            },
          },
        ]}
        data={submissions || []}
        actions={[
          {
            label: "View Data",
            onClick: handleViewData,
          },
        ]}
        emptyMessage="No submissions yet. Share form links with vendors to start collecting data."
      />

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="sm:max-width-[600px]" data-testid="dialog-submission">
          <DialogHeader>
            <DialogTitle>Submission Data</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && format(new Date(selectedSubmission.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-4 max-h-[500px] overflow-y-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap" data-testid="text-submission-data">
              {JSON.stringify(selectedSubmission?.data, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
