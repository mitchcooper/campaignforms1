import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";

export default function FormBuilder() {
  const params = useParams();
  const formId = params.id as string;
  const [, setLocation] = useLocation();
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
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
        description: "Your form has been saved successfully.",
      });
    },
  });

  useEffect(() => {
    if (form) {
      const creatorInstance = new SurveyCreator({
        showLogicTab: true,
        isAutoSave: false,
      });

      // Load existing form JSON
      creatorInstance.JSON = form.json;

      // Configure save function
      creatorInstance.saveSurveyFunc = async (saveNo: number, callback: (no: number, success: boolean) => void) => {
        try {
          await updateMutation.mutateAsync({
            json: creatorInstance.JSON,
            version: form.version + 1,
          });
          callback(saveNo, true);
        } catch (error) {
          callback(saveNo, false);
          toast({
            title: "Save failed",
            description: "Failed to save form. Please try again.",
            variant: "destructive",
          });
        }
      };

      setCreator(creatorInstance);
    }
  }, [form]);

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
    <div className="space-y-4">
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <Button variant="ghost" onClick={() => setLocation("/forms")} className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Forms
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-builder-title">{form.title}</h1>
          <p className="text-sm text-muted-foreground">
            Version {form.version} • {form.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border overflow-hidden bg-background" style={{ minHeight: "600px" }}>
        {creator ? (
          <SurveyCreatorComponent creator={creator} />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <p className="text-muted-foreground">Loading form builder...</p>
          </div>
        )}
      </div>
    </div>
  );
}
