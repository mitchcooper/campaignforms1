import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import CampaignManage from "@/pages/campaign-manage";
import Vendors from "@/pages/vendors";
import Forms from "@/pages/forms";
import FormBuilder from "@/pages/form-builder";
import Submissions from "@/pages/submissions";
import VendorForm from "@/pages/vendor-form";
import VendorPortal from "@/pages/vendor-portal";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between p-4 border-b border-border bg-background">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold text-foreground">Harcourts Cooper & Co</span>
              <span className="text-muted-foreground mx-2">•</span>
              <span className="text-muted-foreground">Campaign Forms</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/form/:token" component={VendorForm} />
      <Route path="/portal/:vendorId" component={VendorPortal} />
      
      {/* Admin routes with sidebar */}
      <Route path="/">
        <AdminLayout>
          <Dashboard />
        </AdminLayout>
      </Route>
      <Route path="/campaigns">
        <AdminLayout>
          <Campaigns />
        </AdminLayout>
      </Route>
      <Route path="/campaigns/:id/manage">
        <AdminLayout>
          <CampaignManage />
        </AdminLayout>
      </Route>
      <Route path="/vendors">
        <AdminLayout>
          <Vendors />
        </AdminLayout>
      </Route>
      <Route path="/forms">
        <AdminLayout>
          <Forms />
        </AdminLayout>
      </Route>
      <Route path="/forms/:id/builder">
        <AdminLayout>
          <FormBuilder />
        </AdminLayout>
      </Route>
      <Route path="/submissions">
        <AdminLayout>
          <Submissions />
        </AdminLayout>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  // Harcourts Cooper & Co custom sidebar width
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <Router />
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
