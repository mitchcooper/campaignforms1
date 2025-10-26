import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, Copy, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ResendDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  formId: string;
  formTitle: string;
  existingVendorIds: string[]; // Vendors who already have access links
}

export function ResendDocumentDialog({ 
  open, 
  onClose, 
  campaignId, 
  formId, 
  formTitle, 
  existingVendorIds 
}: ResendDocumentDialogProps) {
  const { toast } = useToast();
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{
    vendorId: string;
    vendorName: string;
    url: string;
  }>>([]);

  // Fetch campaign data to get all vendors
  const { data: campaignData } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/full`],
    enabled: open,
  });

  const resendMutation = useMutation({
    mutationFn: async (vendorIds: string[]) => {
      return apiRequest("POST", `/api/campaigns/${campaignId}/forms/${formId}/resend`, {
        vendorIds,
        expiresInHours: 168, // 7 days
      });
    },
    onSuccess: (response) => {
      setGeneratedLinks(response.links);
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/full`] });
      toast({
        title: "Document re-sent successfully",
        description: `Generated ${response.links.length} new access links.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to re-send document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter out vendors who already have access links
  const availableVendors = campaignData?.vendors.filter(vendor => 
    !existingVendorIds.includes(vendor.id)
  ) || [];

  const handleVendorToggle = (vendorId: string, checked: boolean) => {
    if (checked) {
      setSelectedVendorIds(prev => [...prev, vendorId]);
    } else {
      setSelectedVendorIds(prev => prev.filter(id => id !== vendorId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVendorIds(availableVendors.map(v => v.id));
    } else {
      setSelectedVendorIds([]);
    }
  };

  const handleResend = () => {
    if (selectedVendorIds.length === 0) {
      toast({
        title: "No vendors selected",
        description: "Please select at least one vendor to re-send the document to.",
        variant: "destructive",
      });
      return;
    }
    resendMutation.mutate(selectedVendorIds);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Access link has been copied to your clipboard.",
    });
  };

  const handleClose = () => {
    setSelectedVendorIds([]);
    setGeneratedLinks([]);
    onClose();
  };

  if (generatedLinks.length > 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Re-sent Successfully</DialogTitle>
            <DialogDescription>
              New access links have been generated for the selected vendors
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-64 overflow-y-auto">
            {generatedLinks.map((link, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{link.vendorName}</h4>
                      <p className="text-sm text-muted-foreground">New access link generated</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(link.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                    {link.url}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Re-send Document</DialogTitle>
          <DialogDescription>
            Send "{formTitle}" to additional vendors who haven't received it yet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p><strong>Title:</strong> {formTitle}</p>
                <p><strong>Available vendors:</strong> {availableVendors.length} vendors who haven't received this document</p>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={selectedVendorIds.length === availableVendors.length && availableVendors.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="selectAll" className="text-sm font-medium">
                Select all available vendors ({availableVendors.length})
              </label>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableVendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center space-x-2 p-2 rounded border">
                  <Checkbox
                    id={vendor.id}
                    checked={selectedVendorIds.includes(vendor.id)}
                    onCheckedChange={(checked) => handleVendorToggle(vendor.id, !!checked)}
                  />
                  <div className="flex-1">
                    <label htmlFor={vendor.id} className="text-sm font-medium">
                      {vendor.name}
                    </label>
                    {vendor.email && (
                      <p className="text-xs text-muted-foreground">{vendor.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{selectedVendorIds.length} vendor{selectedVendorIds.length !== 1 ? 's' : ''} selected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleResend}
            disabled={resendMutation.isPending || selectedVendorIds.length === 0}
          >
            {resendMutation.isPending ? "Sending..." : "Re-send Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


