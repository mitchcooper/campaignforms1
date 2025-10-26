import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, CheckCircle2, Clock, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AccessLink {
  id: string;
  token: string;
  vendorId: string;
  campaignId: string;
  formId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface AccessLinksDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  formId: string;
  formTitle: string;
}

export function AccessLinksDialog({ open, onClose, campaignId, formId, formTitle }: AccessLinksDialogProps) {
  const { toast } = useToast();
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());

  // Fetch access links for this campaign and form
  const { data: accessLinks, isLoading } = useQuery<AccessLink[]>({
    queryKey: [`/api/campaigns/${campaignId}/forms/${formId}/access-links`],
    enabled: open,
  });

  // Fetch vendors to get names
  const { data: campaignData } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/full`],
    enabled: open,
  });

  const handleCopyLink = (url: string, linkId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinks(prev => new Set([...prev, linkId]));
    toast({
      title: "Link copied",
      description: "Access link has been copied to your clipboard.",
    });
    
    // Remove from copied set after 2 seconds
    setTimeout(() => {
      setCopiedLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(linkId);
        return newSet;
      });
    }, 2000);
  };

  const getVendorName = (vendorId: string) => {
    const vendor = campaignData?.vendors.find(v => v.id === vendorId);
    return vendor?.name || "Unknown Vendor";
  };

  const getVendorEmail = (vendorId: string) => {
    const vendor = campaignData?.vendors.find(v => v.id === vendorId);
    return vendor?.email;
  };

  const isLinkExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isLinkUsed = (usedAt: string | null) => {
    return usedAt !== null;
  };

  const getLinkStatus = (link: AccessLink) => {
    if (isLinkUsed(link.usedAt)) return "completed";
    if (isLinkExpired(link.expiresAt)) return "expired";
    return "pending";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Access Links for {formTitle}</DialogTitle>
            <DialogDescription>Loading access links...</DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading access links...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Access Links for {formTitle}</DialogTitle>
          <DialogDescription>
            Manage and track access links for this document
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {accessLinks && accessLinks.length > 0 ? (
            accessLinks.map((link) => {
              const status = getLinkStatus(link);
              const baseUrl = window.location.origin;
              const url = `${baseUrl}/form/${link.token}`;
              const isCopied = copiedLinks.has(link.id);
              
              return (
                <Card key={link.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{getVendorName(link.vendorId)}</div>
                          {getVendorEmail(link.vendorId) && (
                            <div className="text-sm text-muted-foreground">
                              {getVendorEmail(link.vendorId)}
                            </div>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded border overflow-x-auto">
                          {url}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(url, link.id)}
                          disabled={isCopied}
                        >
                          {isCopied ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          disabled={status === "expired"}
                        >
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created: {format(new Date(link.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        <span>Expires: {format(new Date(link.expiresAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        {link.usedAt && (
                          <span>Used: {format(new Date(link.usedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No access links found</h3>
              <p className="text-muted-foreground">
                This document hasn't been sent to any vendors yet.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


