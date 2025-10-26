import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Users, CheckCircle2, ExternalLink, Copy } from "lucide-react";
import { format } from "date-fns";

const sendFormSchema = z.object({
  formId: z.string().min(1, "Form is required"),
  vendorIds: z.array(z.string()).min(1, "At least one vendor must be selected"),
  sendToAll: z.boolean().default(false),
  signingMode: z.enum(["all", "any"]).default("all"),
  signatoryNames: z.record(z.string(), z.string()).optional(), // vendorId -> signatory name
});

type SendFormData = z.infer<typeof sendFormSchema>;

interface SendFormDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

export function SendFormDialog({ open, onClose, campaignId }: SendFormDialogProps) {
  const { toast } = useToast();
  const [generatedLinks, setGeneratedLinks] = useState<Array<{
    vendorId: string;
    vendorName: string;
    formId: string;
    url: string;
  }>>([]);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);

  const form = useForm<SendFormData>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: {
      formId: "",
      vendorIds: [],
      sendToAll: false,
      signingMode: "all",
      signatoryNames: {},
    },
  });

  // Fetch campaign data
  const { data: campaignData } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/full`],
  });

  // Fetch available forms
  const { data: forms } = useQuery({
    queryKey: ["/api/forms"],
  });

  const sendFormMutation = useMutation({
    mutationFn: async (data: SendFormData) => {
      // First, send the form to the campaign
      await apiRequest("POST", `/api/campaigns/${campaignId}/send-form`, {
        formId: data.formId,
        sentBy: "admin", // TODO: Get from auth context
      });

      // Create form instance if this form has signature fields
      let formInstanceId = null;
      const selectedForm = forms?.find(f => f.id === data.formId);
      if (selectedForm?.template && selectedForm.template.includes("type: signature")) {
        const formInstance = await apiRequest("POST", "/api/form-instances", {
          formId: data.formId,
          campaignId,
          data: {},
          signingMode: data.signingMode,
        });
        formInstanceId = formInstance.id;
      }

      // Then generate links for selected vendors
      const links = [];
      for (const vendorId of data.vendorIds) {
        const vendor = campaignData?.vendors.find(v => v.id === vendorId);
        if (vendor) {
          const signatoryName = data.signatoryNames?.[vendorId] || vendor.name;
          const linkResponse = await apiRequest("POST", "/api/links/issue", {
            vendorId,
            campaignId,
            formId: data.formId,
            formInstanceId,
            signatoryName,
            signatoryEmail: vendor.email,
            signatoryRole: `Signatory for ${vendor.name}`,
            expiresInHours: 168, // 7 days
          });
          
          links.push({
            vendorId,
            vendorName: vendor.name,
            formId: data.formId,
            url: linkResponse.url,
          });
        }
      }
      
      return links;
    },
    onSuccess: (links) => {
      setGeneratedLinks(links);
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/full`] });
      toast({
        title: "Form sent successfully",
        description: `Generated ${links.length} form links for vendors.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendToAllChange = (checked: boolean) => {
    form.setValue("sendToAll", checked);
    if (checked) {
      const allVendorIds = campaignData?.vendors.map(v => v.id) || [];
      form.setValue("vendorIds", allVendorIds);
    } else {
      form.setValue("vendorIds", []);
    }
  };

  const handleVendorToggle = (vendorId: string, checked: boolean) => {
    const currentVendors = form.getValues("vendorIds");
    if (checked) {
      form.setValue("vendorIds", [...currentVendors, vendorId]);
    } else {
      form.setValue("vendorIds", currentVendors.filter(id => id !== vendorId));
    }
  };

  const onSubmit = (data: SendFormData) => {
    setIsGeneratingLinks(true);
    sendFormMutation.mutate(data);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Form link has been copied to your clipboard.",
    });
  };

  const handleClose = () => {
    form.reset();
    setGeneratedLinks([]);
    setIsGeneratingLinks(false);
    onClose();
  };

  const selectedForm = forms?.find(f => f.id === form.watch("formId"));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Form to Campaign</DialogTitle>
          <DialogDescription>
            Select a form template and choose which vendors to send it to
          </DialogDescription>
        </DialogHeader>

        {generatedLinks.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold">Form Links Generated</h3>
              <p className="text-muted-foreground">
                Share these links with the respective vendors
              </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {generatedLinks.map((link, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{link.vendorName}</h4>
                        <p className="text-sm text-muted-foreground">Form ID: {link.formId}</p>
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
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Form Selection */}
              <FormField
                control={form.control}
                name="formId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Form Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a form template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {forms?.filter(f => f.isActive).map((formItem) => (
                          <SelectItem key={formItem.id} value={formItem.id}>
                            {formItem.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Preview */}
              {selectedForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Form Preview
                    </CardTitle>
                    <CardDescription>{selectedForm.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Version: {selectedForm.version}</p>
                      <p>Created: {format(new Date(selectedForm.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vendor Selection */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendToAll"
                    checked={form.watch("sendToAll")}
                    onCheckedChange={handleSendToAllChange}
                  />
                  <label htmlFor="sendToAll" className="text-sm font-medium">
                    Send to all vendors ({campaignData?.vendors.length || 0})
                  </label>
                </div>

                {!form.watch("sendToAll") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Vendors</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {campaignData?.vendors.map((vendor) => (
                        <div key={vendor.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={vendor.id}
                            checked={form.watch("vendorIds").includes(vendor.id)}
                            onCheckedChange={(checked) => handleVendorToggle(vendor.id, !!checked)}
                          />
                          <label htmlFor={vendor.id} className="text-sm">
                            {vendor.name} {vendor.email && `(${vendor.email})`}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Signing Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Signing Configuration</h3>
                
                {/* Signing Mode */}
                <FormField
                  control={form.control}
                  name="signingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signing Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose signing mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All signatories must sign</SelectItem>
                          <SelectItem value="any">Any signatory can sign</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Signatory Names */}
                {form.watch("vendorIds").length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Signatory Names (Optional)</label>
                    <div className="space-y-2">
                      {form.watch("vendorIds").map((vendorId) => {
                        const vendor = campaignData?.vendors.find(v => v.id === vendorId);
                        return (
                          <div key={vendorId} className="flex items-center gap-2">
                            <label className="text-sm w-32 truncate">
                              {vendor?.name}
                            </label>
                            <Input
                              placeholder="Signatory name (optional)"
                              value={form.watch("signatoryNames")?.[vendorId] || ""}
                              onChange={(e) => {
                                const currentNames = form.getValues("signatoryNames") || {};
                                form.setValue("signatoryNames", {
                                  ...currentNames,
                                  [vendorId]: e.target.value,
                                });
                              }}
                              className="flex-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{selectedForm?.title || "No form selected"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {form.watch("sendToAll") 
                          ? `All ${campaignData?.vendors.length || 0} vendors`
                          : `${form.watch("vendorIds").length} selected`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendFormMutation.isPending || isGeneratingLinks}
                >
                  {isGeneratingLinks ? "Generating Links..." : "Send Form"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}


