import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { FormTemplateEditor } from "@/components/form-template-editor";
import { FormAST, ValidationError } from "@shared/template-parser";

export default function FormBuilder() {
  const params = useParams();
  const formId = params.id as string;
  const [, setLocation] = useLocation();
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { toast } = useToast();

  const { data: form, isLoading } = useQuery({
    queryKey: ["/api/forms", formId],
    enabled: !!formId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/forms/${formId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms", formId] });
      toast({
        title: "Form saved",
        description: "Your form template has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveTemplate = async (template: string, ast: FormAST) => {
    try {
      await updateMutation.mutateAsync({
        template,
        // ast and htmlPreview are generated server-side, don't send them
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleValidationError = (errors: ValidationError[]) => {
    setValidationErrors(errors);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-muted-foreground">Form not found</p>
          <Button onClick={() => setLocation("/forms")} className="mt-4">
            Back to Forms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <Button
          variant="ghost"
          onClick={() => setLocation("/forms")}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forms
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-builder-title">
            {form.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Version {form.version} • {form.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Validation Errors</h3>
              <ul className="space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-800">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="flex-1 flex flex-col rounded-md border border-border overflow-hidden bg-background">
        <FormTemplateEditor
          initialTemplate={form.template || ""}
          onSave={handleSaveTemplate}
          onError={handleValidationError}
        />
      </div>
    </div>
  );
}
