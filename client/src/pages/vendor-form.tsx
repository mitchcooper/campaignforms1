import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import "survey-core/survey-core.css";

interface FormContext {
  formId: string;
  campaignId: string;
  vendorId: string;
  formJson: any;
  prefill?: Record<string, any>;
  formTitle?: string;
  campaignName?: string;
}

export default function VendorForm() {
  const params = useParams();
  const token = params.token as string;
  const [, setLocation] = useLocation();
  const [context, setContext] = useState<FormContext | null>(null);
  const [survey, setSurvey] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadForm = async () => {
      try {
        const response = await apiRequest("GET", `/api/links/resolve?token=${token}`);
        setContext(response);
      } catch (err) {
        setError("Invalid or expired form link. Please contact the administrator.");
      } finally {
        setIsLoading(false);
      }
    };

    loadForm();
  }, [token]);

  useEffect(() => {
    if (context) {
      const surveyModel = new Model(context.formJson);

      // Apply prefill data if available
      if (context.prefill) {
        Object.entries(context.prefill).forEach(([key, value]) => {
          surveyModel.setValue(key, value);
        });
      }

      // Handle form completion
      surveyModel.onComplete.add(async (sender) => {
        try {
          await apiRequest("POST", "/api/submissions", {
            formId: context.formId,
            campaignId: context.campaignId,
            vendorId: context.vendorId,
            data: sender.data,
          });
          setIsSubmitted(true);
        } catch (err) {
          alert("Failed to submit form. Please try again.");
        }
      });

      setSurvey(surveyModel);
    }
  }, [context]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-8" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Form Not Available</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[hsl(142,71%,45%)]/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[hsl(142,71%,45%)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Thank You!</h2>
              <p className="text-sm text-muted-foreground">
                Your form has been submitted successfully. We'll be in touch soon.
              </p>
            </div>
            <Button onClick={() => setLocation("/")} className="mt-4" data-testid="button-return-home">
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary">
              <svg className="h-6 w-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {context?.formTitle || "Campaign Form"}
              </h1>
              <p className="text-sm text-muted-foreground">Harcourts Cooper & Co</p>
            </div>
          </div>
          {context?.campaignName && (
            <p className="text-sm text-muted-foreground">
              {context.campaignName}
            </p>
          )}
        </div>

        <Card className="glass border-0 p-8" data-testid="card-survey-form">
          {survey && <Survey model={survey} />}
        </Card>
      </div>
    </div>
  );
}
