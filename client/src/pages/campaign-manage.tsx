import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { ArrowLeft, MapPin, Calendar, Users, FileText, CheckCircle2, RefreshCw, Home, UserCheck, ClipboardList } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CooperListingDialog } from "@/components/cooper-listing-dialog";
import { SendFormDialog } from "@/components/send-form-dialog";
import { VendorDialog } from "@/components/vendor-dialog";
import { LinkDialog } from "@/components/link-dialog";
import { AccessLinksDialog } from "@/components/access-links-dialog";
import { ResendDocumentDialog } from "@/components/resend-document-dialog";

interface CampaignFullData {
  campaign: {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    listingId: number | null;
    listingData: any;
    listingLastFetched: string | null;
    manualAddress: string | null;
    createdAt: string;
    updatedAt: string;
  };
  vendors: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    campaignId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  sentForms: Array<{
    id: string;
    campaignId: string;
    formId: string;
    sentAt: string;
    sentBy: string | null;
    status: string;
    createdAt: string;
    form: {
      id: string;
      title: string;
      description: string | null;
      template: string;
      version: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    submissionCount: number;
    totalVendors: number;
  }>;
  submissions: Array<{
    id: string;
    formId: string;
    campaignId: string;
    vendorId: string | null;
    data: any;
    status: string;
    createdAt: string;
  }>;
}

export default function CampaignManage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const campaignId = params.id as string;
  const { toast } = useToast();
  
  const [isCooperDialogOpen, setIsCooperDialogOpen] = useState(false);
  const [isSendFormDialogOpen, setIsSendFormDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isAccessLinksDialogOpen, setIsAccessLinksDialogOpen] = useState(false);
  const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const { data: campaignData, isLoading, error } = useQuery<CampaignFullData>({
    queryKey: [`/api/campaigns/${campaignId}/full`],
  });

  const refreshListingMutation = useMutation({
    mutationFn: async (listingData: any) => {
      return apiRequest("POST", `/api/campaigns/${campaignId}/refresh-listing`, { listingData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/full`] });
      toast({
        title: "Listing refreshed",
        description: "Property data has been updated successfully.",
      });
    },
  });

  const linkListingMutation = useMutation({
    mutationFn: async ({ listingId, listingData }: { listingId: number; listingData: any }) => {
      return apiRequest("POST", `/api/campaigns/${campaignId}/link-listing`, { listingId, listingData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/full`] });
      toast({
        title: "Listing linked",
        description: "Property has been linked to this campaign.",
      });
    },
  });

  const handleRefreshListing = async () => {
    if (!campaignData?.campaign.listingId) return;
    
    try {
      const listingData = await apiRequest("GET", `/api/cooper/listings/${campaignData.campaign.listingId}`);
      refreshListingMutation.mutate(listingData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh listing data.",
        variant: "destructive",
      });
    }
  };

  const handleLinkListing = (listingId: number, listingData: any) => {
    linkListingMutation.mutate({ listingId, listingData });
    setIsCooperDialogOpen(false);
  };

  const handleIssueFormLink = (vendor: any) => {
    setSelectedVendor(vendor);
    setIsLinkDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !campaignData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/campaigns")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Campaign not found or error loading data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { campaign, vendors, sentForms, submissions } = campaignData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/campaigns")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                {campaign.status}
              </Badge>
              {campaign.startDate && (
                <span className="text-sm text-muted-foreground">
                  {format(new Date(campaign.startDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCooperDialogOpen(true)}>
            Link Property
          </Button>
          <Button onClick={() => setIsSendFormDialogOpen(true)}>
            Send Form
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="property" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="property" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Property Details
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({sentForms.length})
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Submissions ({submissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Property Details Tab */}
        <TabsContent value="property" className="space-y-6">
          {campaign.listingData ? (
            <div className="space-y-6">
              {/* Hero Section */}
              <Card className="overflow-hidden">
                {campaign.listingData.primaryPhotoUrl && (
                  <div className="relative h-64 w-full">
                    <img 
                      src={campaign.listingData.primaryPhotoUrl} 
                      alt="Property" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <h2 className="text-2xl font-bold">{campaign.listingData.internetHeading}</h2>
                      <p className="text-lg">{campaign.listingData.displayAddress}</p>
                      <p className="text-xl font-semibold">{campaign.listingData.internetPrice}</p>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={handleRefreshListing}
                        disabled={refreshListingMutation.isPending}
                        className="bg-white/90 hover:bg-white"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {campaign.listingData.bedrooms && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{campaign.listingData.bedrooms}</div>
                      <div className="text-sm text-muted-foreground">Bedrooms</div>
                    </CardContent>
                  </Card>
                )}
                {campaign.listingData.bathrooms && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{campaign.listingData.bathrooms}</div>
                      <div className="text-sm text-muted-foreground">Bathrooms</div>
                    </CardContent>
                  </Card>
                )}
                {campaign.listingData.landArea && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{campaign.listingData.landArea}m²</div>
                      <div className="text-sm text-muted-foreground">Land Area</div>
                    </CardContent>
                  </Card>
                )}
                {campaign.listingData.floorArea && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{campaign.listingData.floorArea}m²</div>
                      <div className="text-sm text-muted-foreground">Floor Area</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Property Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{campaign.listingData.propertyTypeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline">{campaign.listingData.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Listing #:</span>
                      <span className="font-medium">{campaign.listingData.displayListingNumber}</span>
                    </div>
                    {campaign.listingData.carSpacesGarage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Garage:</span>
                        <span className="font-medium">{campaign.listingData.carSpacesGarage} spaces</span>
                      </div>
                    )}
                    {campaign.listingData.carSpacesCarport && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carport:</span>
                        <span className="font-medium">{campaign.listingData.carSpacesCarport} spaces</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Agents */}
                {campaign.listingData.users && campaign.listingData.users.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Agents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {campaign.listingData.users.map((agent: any, index: number) => (
                        <div key={index} className="flex items-center gap-3">
                          {agent.photoUrl && (
                            <img 
                              src={agent.photoUrl} 
                              alt={agent.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-muted-foreground">{agent.position}</div>
                            {agent.businessPhone && (
                              <div className="text-sm text-muted-foreground">{agent.businessPhone}</div>
                            )}
                            {agent.emailAddress && (
                              <div className="text-sm text-muted-foreground">{agent.emailAddress}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Open Homes */}
              {campaign.listingData.listingOpenHomes && campaign.listingData.listingOpenHomes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Open Homes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {campaign.listingData.listingOpenHomes.map((openHome: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(openHome.startsAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(openHome.startsAt), "h:mm a")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Virtual Tours */}
              {campaign.listingData.tours && (campaign.listingData.tours.virtualTourUrl || campaign.listingData.tours.videoTourUrl) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Virtual Tours</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {campaign.listingData.tours.virtualTourUrl && (
                      <Button asChild variant="outline" className="w-full">
                        <a href={campaign.listingData.tours.virtualTourUrl} target="_blank" rel="noopener noreferrer">
                          View Virtual Tour
                        </a>
                      </Button>
                    )}
                    {campaign.listingData.tours.videoTourUrl && (
                      <Button asChild variant="outline" className="w-full">
                        <a href={campaign.listingData.tours.videoTourUrl} target="_blank" rel="noopener noreferrer">
                          View Video Tour
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : campaign.manualAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Property Information
                </CardTitle>
                <CardDescription>
                  Manual property details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Address</h3>
                    <p className="text-muted-foreground">{campaign.manualAddress}</p>
                  </div>
                  <Button onClick={() => setIsCooperDialogOpen(true)}>
                    Link Cooper & Co Property
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No property linked</h3>
                <p className="text-muted-foreground mb-4">Link a Cooper & Co listing or enter manual property details</p>
                <Button onClick={() => setIsCooperDialogOpen(true)}>
                  Link Cooper & Co Property
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Vendors</h2>
              <p className="text-muted-foreground">Manage vendors for this campaign</p>
            </div>
            <Button onClick={() => setIsVendorDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </div>
          
          <DataTable
            columns={[
              { header: "Name", accessor: "name" },
              { header: "Email", accessor: (row) => row.email || "—" },
              { header: "Phone", accessor: (row) => row.phone || "—" },
              {
                header: "Actions",
                accessor: (row) => (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleIssueFormLink(row)}
                  >
                    Issue Form Link
                  </Button>
                ),
              },
            ]}
            data={vendors}
            emptyMessage="No vendors added to this campaign yet. Add your first vendor to get started."
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="forms" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Documents & Agreements</h2>
              <p className="text-muted-foreground">Manage document workflow and track completion status</p>
            </div>
            <Button onClick={() => setIsSendFormDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Send Document
            </Button>
          </div>
          
          <DataTable
            columns={[
              { 
                header: "Document Name", 
                accessor: (row) => row.form?.title || "Unknown Document"
              },
              { 
                header: "Status", 
                accessor: (row) => {
                  const isCompleted = row.submissionCount > 0 && row.submissionCount >= row.totalVendors;
                  const status = isCompleted ? 'completed' : (row.totalVendors > 0 ? 'sent' : 'draft');
                  
                  return (
                    <Badge 
                      variant={status === 'completed' ? 'default' : status === 'sent' ? 'secondary' : 'outline'}
                      className={status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {status === 'completed' ? 'Completed' : status === 'sent' ? 'Sent' : 'Draft'}
                    </Badge>
                  );
                }
              },
              { 
                header: "Recipients", 
                accessor: (row) => {
                  if (row.totalVendors === 0) return "—";
                  return `${row.submissionCount}/${row.totalVendors} completed`;
                }
              },
              { 
                header: "Sent Date", 
                accessor: (row) => format(new Date(row.sentAt), "MMM d, yyyy")
              },
              { 
                header: "Sent By", 
                accessor: (row) => row.sentBy || "—"
              },
            ]}
            data={sentForms}
            actions={[
              {
                label: "View Links",
                onClick: (row) => {
                  setSelectedDocument(row);
                  setIsAccessLinksDialogOpen(true);
                }
              },
              {
                label: "Re-send",
                onClick: (row) => {
                  setSelectedDocument(row);
                  setIsResendDialogOpen(true);
                }
              }
            ]}
            emptyMessage="No documents sent to this campaign yet."
          />
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Submissions</h2>
              <p className="text-muted-foreground">Track document completion status</p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">{submissions.length} completed</span>
            </div>
          </div>
          
          <DataTable
            columns={[
              { header: "Vendor", accessor: (row) => {
                const vendor = vendors.find(v => v.id === row.vendorId);
                return vendor?.name || "—";
              }},
              { header: "Form ID", accessor: "formId" },
              { header: "Submitted", accessor: (row) => format(new Date(row.createdAt), "MMM d, yyyy") },
              { 
                header: "Status", 
                accessor: (row) => (
                  <Badge variant="default">
                    {row.status}
                  </Badge>
                )
              },
            ]}
            data={submissions}
            emptyMessage="No submissions received yet. Send documents to vendors to start collecting responses."
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CooperListingDialog
        open={isCooperDialogOpen}
        onClose={() => setIsCooperDialogOpen(false)}
        onSelectListing={handleLinkListing}
      />

      <SendFormDialog
        open={isSendFormDialogOpen}
        onClose={() => setIsSendFormDialogOpen(false)}
        campaignId={campaignId}
      />

      <VendorDialog
        open={isVendorDialogOpen}
        onClose={() => setIsVendorDialogOpen(false)}
      />

      <LinkDialog
        open={isLinkDialogOpen}
        onClose={() => {
          setIsLinkDialogOpen(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
      />

      <AccessLinksDialog
        open={isAccessLinksDialogOpen}
        onClose={() => {
          setIsAccessLinksDialogOpen(false);
          setSelectedDocument(null);
        }}
        campaignId={campaignId}
        formId={selectedDocument?.formId || ""}
        formTitle={selectedDocument?.form?.title || ""}
      />

      <ResendDocumentDialog
        open={isResendDialogOpen}
        onClose={() => {
          setIsResendDialogOpen(false);
          setSelectedDocument(null);
        }}
        campaignId={campaignId}
        formId={selectedDocument?.formId || ""}
        formTitle={selectedDocument?.form?.title || ""}
        existingVendorIds={selectedDocument?.totalVendors ? [] : []} // TODO: Get existing vendor IDs from access links
      />
    </div>
  );
}
