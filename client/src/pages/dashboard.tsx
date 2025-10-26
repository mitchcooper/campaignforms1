import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { Calendar, Users, FileText, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your campaign forms activity</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const campaigns = stats?.campaigns || 0;
  const vendors = stats?.vendors || 0;
  const forms = stats?.forms || 0;
  const submissions = stats?.submissions || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your campaign forms activity</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Campaigns"
          value={campaigns}
          icon={Calendar}
          variant="primary"
          description="Active campaigns"
        />
        <StatCard
          title="Vendors"
          value={vendors}
          icon={Users}
          variant="cyan"
          description="Registered vendors"
        />
        <StatCard
          title="Forms"
          value={forms}
          icon={FileText}
          variant="primary"
          description="Form templates"
        />
        <StatCard
          title="Submissions"
          value={submissions}
          icon={Inbox}
          variant="success"
          description="Total submissions"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">New submission received</p>
                  <p className="text-xs text-muted-foreground">Spring Auction Campaign</p>
                </div>
                <span className="text-xs text-muted-foreground">2 min ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">Form link issued</p>
                  <p className="text-xs text-muted-foreground">Vendor: Smith Family</p>
                </div>
                <span className="text-xs text-muted-foreground">1 hour ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">Campaign created</p>
                  <p className="text-xs text-muted-foreground">Winter Collection 2024</p>
                </div>
                <span className="text-xs text-muted-foreground">3 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/campaigns"
                className="block p-4 rounded-md border border-border hover-elevate active-elevate-2 transition-colors"
                data-testid="link-create-campaign"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Create Campaign</p>
                    <p className="text-xs text-muted-foreground">Start a new campaign</p>
                  </div>
                </div>
              </a>
              <a
                href="/forms"
                className="block p-4 rounded-md border border-border hover-elevate active-elevate-2 transition-colors"
                data-testid="link-create-form"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(195,100%,47%)] text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Design Form</p>
                    <p className="text-xs text-muted-foreground">Create form templates</p>
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
