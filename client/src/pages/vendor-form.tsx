import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";
import { FormAST } from "@shared/template-parser";

interface FormInstance {
  id: string;
  data: Record<string, any>;
  status: string;
  signingMode: "all" | "any";
}

interface Signatory {
  id: string;
  signatoryName: string;
  signedAt?: string;
}

interface FormContext {
  formId: string;
  campaignId: string;
  vendorId: string;
  formInstanceId?: string;
  formAST: FormAST;
  prefill?: Record<string, any>;
  formTitle?: string;
  campaignName?: string;
  formInstance?: FormInstance;
  signatories?: Signatory[];
}

export default function VendorForm() {
  const params = useParams();
  const token = params.token as string;
  const [, setLocation] = useLocation();
  const [context, setContext] = useState<FormContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignatory, setCurrentSignatory] = useState<string | undefined>();

  useEffect(() => {
    const loadForm = async () => {
      try {
        const response = await apiRequest("GET", `/api/links/resolve?token=${token}`);
        setContext(response);
        
        // Find current signatory if this is a form instance
        if (response.formInstanceId && response.signatories) {
          // Find the signatory for this vendor (this would need to be determined server-side)
          // For now, we'll use the first signatory as a placeholder
          const currentSignatoryId = response.signatories[0]?.id;
          setCurrentSignatory(currentSignatoryId);
        }
      } catch (err) {
        setError("Invalid or expired form link. Please contact the administrator.");
      } finally {
        setIsLoading(false);
      }
    };

    loadForm();
  }, [token]);

  // Auto-save form instance data
  const handleFormInstanceUpdate = async (data: Record<string, any>) => {
    if (!context?.formInstanceId) return;
    
    try {
      await apiRequest("PATCH", `/api/form-instances/${context.formInstanceId}/data`, {
        data,
      });
    } catch (err) {
      console.error("Failed to auto-save form instance:", err);
    }
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    if (!context) return;

    setIsSubmitting(true);
    try {
      // Extract signature data from form data
      const signatureData: Record<string, any> = {};
      const nonSignatureData: Record<string, any> = {};
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'type' in value && 'data' in value) {
          // This is signature data
          signatureData[key] = value;
        } else {
          nonSignatureData[key] = value;
        }
      });

      await apiRequest("POST", "/api/submissions", {
        formId: context.formId,
        campaignId: context.campaignId,
        vendorId: context.vendorId,
        formInstanceId: context.formInstanceId,
        data: nonSignatureData,
        signatureData: Object.keys(signatureData).length > 0 ? signatureData : undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      alert("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-3xl text-center">
          {/* Harcourts Cooper & Co Logo */}
          <div className="mb-6">
            <div className="inline-flex items-baseline gap-2 text-2xl font-bold tracking-tight">
              <span className="text-primary relative">
                Harcourts
                <span className="absolute bottom-0 left-0 h-1 bg-[#00AEEF] w-[0.6rem]"></span>
              </span>
              <span className="text-[#00AEEF] font-normal">Cooper & Co</span>
            </div>
          </div>
          <Card className="w-full p-6">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-48 mx-auto mb-8" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Harcourts Cooper & Co Logo */}
          <div className="mb-6">
            <div className="inline-flex items-baseline gap-2 text-2xl font-bold tracking-tight">
              <span className="text-primary relative">
                Harcourts
                <span className="absolute bottom-0 left-0 h-1 bg-[#00AEEF] w-[0.6rem]"></span>
              </span>
              <span className="text-[#00AEEF] font-normal">Cooper & Co</span>
            </div>
          </div>
          <Card className="w-full p-6">
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
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Harcourts Cooper & Co Logo */}
          <div className="mb-6">
            <div className="inline-flex items-baseline gap-2 text-2xl font-bold tracking-tight">
              <span className="text-primary relative">
                Harcourts
                <span className="absolute bottom-0 left-0 h-1 bg-[#00AEEF] w-[0.6rem]"></span>
              </span>
              <span className="text-[#00AEEF] font-normal">Cooper & Co</span>
            </div>
          </div>
          <Card className="w-full p-6">
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
              <Button 
                onClick={() => setLocation("/")} 
                className="mt-4 bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                data-testid="button-return-home"
              >
                Return to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          {/* Harcourts Cooper & Co Logo */}
          <div className="mb-6">
            <div className="inline-flex items-baseline gap-2 text-2xl font-bold tracking-tight">
              <span className="text-primary relative">
                Harcourts
                <span className="absolute bottom-0 left-0 h-1 bg-[#00AEEF] w-[0.6rem]"></span>
              </span>
              <span className="text-[#00AEEF] font-normal">Cooper & Co</span>
            </div>
          </div>
          
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {context?.formTitle || "Campaign Form"}
            </h1>
          </div>
        </div>

        <Card className="glass border-0 p-6" data-testid="card-survey-form">
          {context && (
            <DynamicFormRenderer
              ast={context.formAST}
              onSubmit={handleFormSubmit}
              isLoading={isSubmitting}
              initialData={context.prefill}
              formInstance={context.formInstance}
              signatories={context.signatories}
              currentSignatory={currentSignatory}
              onFormInstanceUpdate={handleFormInstanceUpdate}
              isLocked={context.formInstance?.status === "locked"}
              isVoided={context.formInstance?.status === "voided"}
              isCompleted={context.formInstance?.status === "completed"}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
