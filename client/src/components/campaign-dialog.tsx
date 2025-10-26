import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { insertCampaignSchema, type Campaign, type InsertCampaign } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface CampaignDialogProps {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
}

export function CampaignDialog({ open, onClose, campaign }: CampaignDialogProps) {
  const { toast } = useToast();
  const isEditing = !!campaign;

  const form = useForm<InsertCampaign>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: "",
      status: "draft",
      startDate: null,
      endDate: null,
      manualAddress: "",
    },
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        manualAddress: campaign.manualAddress || "",
      });
    } else {
      form.reset({
        name: "",
        status: "draft",
        startDate: null,
        endDate: null,
        manualAddress: "",
      });
    }
  }, [campaign, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertCampaign) => apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully.",
      });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertCampaign) => apiRequest("PATCH", `/api/campaigns/${campaign?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign updated",
        description: "Your campaign has been updated successfully.",
      });
      onClose();
    },
  });

  const onSubmit = (data: InsertCampaign) => {
    // Use the address as the campaign name
    const campaignData = {
      ...data,
      name: data.manualAddress || "New Campaign",
    };

    if (isEditing) {
      updateMutation.mutate(campaignData);
    } else {
      createMutation.mutate(campaignData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-campaign">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the property address for this campaign." : "Enter the property address to create a new campaign."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="manualAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main Street, Auckland"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-campaign-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-campaign">
                {isEditing ? "Update" : "Create"} Campaign
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}