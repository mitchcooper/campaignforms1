import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Building, 
  FileText, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  Home
} from "lucide-react";
import { format } from "date-fns";

interface VendorPortalData {
  vendor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    campaignId: string;
  };
  campaign: {
    id: string;
    name: string;
    status: string;
    listingData: any;
    manualAddress: string | null;
  };
  sentForms: Array<{
    id: string;
    formId: string;
    sentAt: string;
    status: string;
  }>;
  submissions: Array<{
    id: string;
    formId: string;
    data: any;
    status: string;
    createdAt: string;
  }>;
}

export default function VendorPortal() {
  const params = useParams();
  const vendorId = params.vendorId as string;
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: portalData, isLoading: isDataLoading } = useQuery<VendorPortalData>({
    queryKey: [`/api/vendor-portal/${vendorId}`],
    enabled: !!vendorId,
  });

  useEffect(() => {
    if (!vendorId) {
      setError("Invalid vendor access link");
      setIsLoading(false);
    }
  }, [vendorId]);

  if (isLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-4xl mx-auto p-6">
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Home className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-sm text-muted-foreground">
                {error || "Invalid or expired vendor access link."}
              </p>
            </div>
            <Button onClick={() => setLocation("/")} className="mt-4">
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { vendor, campaign, sentForms, submissions } = portalData;

  // Get pending forms (sent but not submitted)
  const pendingForms = sentForms.filter(sentForm => 
    !submissions.some(submission => submission.formId === sentForm.formId)
  );

  // Get completed forms
  const completedForms = sentForms.filter(sentForm => 
    submissions.some(submission => submission.formId === sentForm.formId)
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Harcourts Cooper & Co</h1>
              <p className="text-muted-foreground">Vendor Portal</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Welcome,</p>
              <p className="font-medium">{vendor.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Campaign Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Campaign: {campaign.name}
            </CardTitle>
            <CardDescription>
              Property details and campaign information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.listingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{campaign.listingData.internetHeading}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{campaign.listingData.displayAddress}</span>
                    </div>
                    <p className="text-lg font-semibold text-cyan-600">{campaign.listingData.internetPrice}</p>
                  </div>
                  
                  {campaign.listingData.primaryPhotoUrl && (
                    <img 
                      src={campaign.listingData.primaryPhotoUrl} 
                      alt="Property" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>

                {campaign.listingData.listingOpenHomes && campaign.listingData.listingOpenHomes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Upcoming Open Homes
                    </h4>
                    <div className="space-y-2">
                      {campaign.listingData.listingOpenHomes.map((openHome: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(openHome.startsAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {campaign.listingData.users && campaign.listingData.users.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Agent Contact</h4>
                    <div className="space-y-2">
                      {campaign.listingData.users.map((user: any, index: number) => (
                        <div key={index} className="flex items-center gap-4 text-sm">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-muted-foreground">{user.position}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.businessPhone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                <span>{user.businessPhone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <span>{user.emailAddress}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : campaign.manualAddress ? (
              <div>
                <h3 className="font-semibold text-lg">Property Address</h3>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{campaign.manualAddress}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No property information available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forms Section */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Forms ({pendingForms.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed Forms ({completedForms.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Forms */}
          <TabsContent value="pending" className="space-y-4">
            {pendingForms.length > 0 ? (
              <div className="space-y-4">
                {pendingForms.map((sentForm) => (
                  <Card key={sentForm.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Form ID: {sentForm.formId}</h4>
                          <p className="text-sm text-muted-foreground">
                            Sent: {format(new Date(sentForm.sentAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                          <Button size="sm" asChild>
                            <a href={`/form/${sentForm.formId}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Complete Form
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    You have no pending forms to complete.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Forms */}
          <TabsContent value="completed" className="space-y-4">
            {completedForms.length > 0 ? (
              <DataTable
                columns={[
                  { header: "Form ID", accessor: "formId" },
                  { header: "Completed", accessor: (row) => {
                    const submission = submissions.find(s => s.formId === row.formId);
                    return submission ? format(new Date(submission.createdAt), "MMM d, yyyy") : "—";
                  }},
                  { 
                    header: "Status", 
                    accessor: () => (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )
                  },
                ]}
                data={completedForms}
                emptyMessage="No completed forms yet."
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Forms</h3>
                  <p className="text-muted-foreground">
                    Forms you complete will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}




