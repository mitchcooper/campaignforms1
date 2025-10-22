import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form as FormComponent, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertFormSchema, type Form, type InsertForm } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { z } from "zod";

type FormDialogData = InsertForm;

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  form?: Form | null;
}

export function FormDialog({ open, onClose, form }: FormDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const formComponent = useForm<FormDialogData>({
    resolver: zodResolver(insertFormSchema),
    defaultValues: {
      title: "",
      description: "",
      json: { title: "New Form", pages: [{ elements: [] }] },
      version: 1,
      isActive: true,
    },
  });

  useEffect(() => {
    if (form) {
      formComponent.reset({
        title: form.title,
        description: form.description || "",
        json: form.json,
        version: form.version,
        isActive: form.isActive,
      });
    } else {
      formComponent.reset({
        title: "",
        description: "",
        json: { title: "New Form", pages: [{ elements: [] }] },
        version: 1,
        isActive: true,
      });
    }
  }, [form, formComponent]);

  const createMutation = useMutation({
    mutationFn: (data: InsertForm) => apiRequest("POST", "/api/forms", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Form created",
        description: "Your form has been created. Opening builder...",
      });
      onClose();
      setLocation(`/forms/${response.id}/builder`);
    },
  });

  const onSubmit = (data: FormDialogData) => {
    createMutation.mutate(data as InsertForm);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-width-[500px]" data-testid="dialog-form">
        <DialogHeader>
          <DialogTitle>Create Form</DialogTitle>
          <DialogDescription>
            Enter form details to create a new SurveyJS form template.
          </DialogDescription>
        </DialogHeader>
        <FormComponent {...formComponent}>
          <form onSubmit={formComponent.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={formComponent.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Vendor Details Form" {...field} data-testid="input-form-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formComponent.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter form description..." {...field} data-testid="input-form-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-form">
                Create & Open Builder
              </Button>
            </div>
          </form>
        </FormComponent>
      </DialogContent>
    </Dialog>
  );
}
