import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Vendor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Copy, ExternalLink } from "lucide-react";

const linkSchema = z.object({
  formId: z.string().min(1, "Form is required"),
  expiresInHours: z.coerce.number().min(1).max(720).default(168),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface LinkDialogProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
}

export function LinkDialog({ open, onClose, vendor }: LinkDialogProps) {
  const { toast } = useToast();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const { data: forms } = useQuery({
    queryKey: ["/api/forms"],
  });

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      formId: "",
      expiresInHours: 168,
    },
  });

  const issueMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/links/issue", data),
    onSuccess: (response: any) => {
      setGeneratedUrl(response.url);
      toast({
        title: "Link generated",
        description: "Form link has been created successfully.",
      });
    },
  });

  const onSubmit = (data: LinkFormData) => {
    if (!vendor) return;
    
    issueMutation.mutate({
      vendorId: vendor.id,
      campaignId: vendor.campaignId,
      formId: data.formId,
      expiresInHours: data.expiresInHours,
    });
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast({
        title: "Link copied",
        description: "The form link has been copied to your clipboard.",
      });
    }
  };

  const handleClose = () => {
    setGeneratedUrl(null);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-width-[550px]" data-testid="dialog-link">
        <DialogHeader>
          <DialogTitle>Issue Form Link</DialogTitle>
          <DialogDescription>
            Generate a tokenized form link for {vendor?.name}
          </DialogDescription>
        </DialogHeader>

        {generatedUrl ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Generated Link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background px-3 py-2 rounded border border-border overflow-x-auto" data-testid="text-generated-url">
                  {generatedUrl}
                </code>
                <Button size="icon" variant="outline" onClick={handleCopy} data-testid="button-copy-link">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a href={generatedUrl} target="_blank" rel="noopener noreferrer" data-testid="button-open-link">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button onClick={handleClose} data-testid="button-close">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="formId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-link-form">
                          <SelectValue placeholder="Select form" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {forms?.filter((f: any) => f.isActive).map((formItem: any) => (
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
              <FormField
                control={form.control}
                name="expiresInHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires In (Hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-link-expiry"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Default: 168 hours (7 days)</p>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={issueMutation.isPending} data-testid="button-generate-link">
                  Generate Link
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
