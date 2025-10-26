import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  FormAST,
  Field,
  ConditionalBlock,
  Divider,
  FieldContainer,
  SelectField,
  SignatureField,
} from "@shared/template-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignatureField as SignatureFieldComponent } from "@/components/signature-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2, Clock } from "lucide-react";

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

interface DynamicFormRendererProps {
  ast: FormAST;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
  initialData?: Record<string, any>;
  formInstance?: FormInstance;
  signatories?: Signatory[];
  currentSignatory?: string;
  onFormInstanceUpdate?: (data: Record<string, any>) => void;
  isLocked?: boolean;
  isVoided?: boolean;
  isCompleted?: boolean;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  ast,
  onSubmit,
  isLoading = false,
  initialData = {},
  formInstance,
  signatories = [],
  currentSignatory,
  onFormInstanceUpdate,
  isLocked = false,
  isVoided = false,
  isCompleted = false,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signatureData, setSignatureData] = useState<Record<string, any>>({});

  // Initialize form data from form instance, merging with prefill data
  useEffect(() => {
    if (formInstance?.data) {
      // Merge form instance data with initial prefill data
      // Form instance data takes priority, but prefill data fills in missing values
      const mergedData = { ...initialData, ...formInstance.data };
      setFormData(mergedData);
    }
  }, [formInstance, initialData]);


  // Auto-save form instance data when form data changes (only if not locked/completed/voided)
  useEffect(() => {
    if (formInstance && onFormInstanceUpdate && !isLocked && !isCompleted && !isVoided) {
      const timeoutId = setTimeout(() => {
        onFormInstanceUpdate(formData);
      }, 1000); // Debounce auto-save

      return () => clearTimeout(timeoutId);
    }
  }, [formData, formInstance, onFormInstanceUpdate, isLocked, isCompleted, isVoided]);

  // Get required fields for signing validation
  const getRequiredFields = useCallback(() => {
    const requiredFields: string[] = [];
    
    for (const page of ast.pages) {
      for (const section of page.sections) {
        for (const field of section.fields) {
          if (field.type !== "signature" && field.type !== "divider" && field.type !== "conditional" && field.required) {
            requiredFields.push(field.id);
          }
        }
      }
    }
    
    return requiredFields;
  }, [ast]);

  // Check if all required fields are completed
  const isReadyToSign = useCallback(() => {
    const requiredFields = getRequiredFields();
    return requiredFields.every(fieldId => {
      const value = formData[fieldId];
      return value !== undefined && value !== null && value !== "";
    });
  }, [formData, getRequiredFields]);

  // Get signature fields
  const getSignatureFields = useCallback(() => {
    const signatureFields: SignatureField[] = [];
    
    for (const page of ast.pages) {
      for (const section of page.sections) {
        for (const field of section.fields) {
          if (field.type === "signature") {
            signatureFields.push(field as SignatureField);
          }
        }
      }
    }
    
    return signatureFields;
  }, [ast]);

  // Check if all required signatures are completed
  const checkAllSignaturesCompleted = useCallback(() => {
    const signatureFields = getSignatureFields();
    return signatureFields.every(field => {
      const value = formData[field.id];
      return value && value.type && value.data && value.timestamp;
    });
  }, [formData, getSignatureFields]);

  // Determine visibility of fields based on conditions
  const isFieldVisible = useCallback(
    (condition: { field: string; operator: string; value: any }): boolean => {
      const fieldValue = formData[condition.field];

      switch (condition.operator) {
        case "==":
          return fieldValue == condition.value;
        case "!=":
          return fieldValue != condition.value;
        case ">":
          return Number(fieldValue) > Number(condition.value);
        case "<":
          return Number(fieldValue) < Number(condition.value);
        case ">=":
          return Number(fieldValue) >= Number(condition.value);
        case "<=":
          return Number(fieldValue) <= Number(condition.value);
        case "in":
          const values = Array.isArray(condition.value)
            ? condition.value
            : condition.value.split(",").map((v: string) => v.trim());
          return values.includes(fieldValue);
        case "contains":
          return String(fieldValue).includes(condition.value);
        default:
          return true;
      }
    },
    [formData]
  );

  const handleInputChange = useCallback(
    (fieldId: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
      // Clear error when user starts typing
      if (errors[fieldId]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const validatePage = useCallback((): boolean => {
    const page = ast.pages[currentPage];
    const pageErrors: Record<string, string> = {};

    const validateContainer = (container: FieldContainer) => {
      if (container.type === "divider") return;

      if (container.type === "conditional") {
        if (isFieldVisible(container.condition)) {
          container.children.forEach(validateContainer);
        }
        return;
      }

      const field = container as Field;
      const value = formData[field.id];

      if (field.required && (!value || String(value).trim() === "")) {
        pageErrors[field.id] = `${field.label} is required`;
      }

      // Type-specific validation
      if (value) {
        if (field.type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            pageErrors[field.id] = "Please enter a valid email";
          }
        }

        if (field.type === "number" || field.type === "currency") {
          if (isNaN(Number(value))) {
            pageErrors[field.id] = "Please enter a valid number";
          }
        }

        if ("minLength" in field && field.minLength && String(value).length < field.minLength) {
          pageErrors[field.id] = `Minimum ${field.minLength} characters required`;
        }

        if ("maxLength" in field && field.maxLength && String(value).length > field.maxLength) {
          pageErrors[field.id] = `Maximum ${field.maxLength} characters allowed`;
        }
      }
    };

    for (const section of page.sections) {
      for (const field of section.fields) {
        validateContainer(field);
      }
    }

    setErrors(pageErrors);
    return Object.keys(pageErrors).length === 0;
  }, [ast.pages, currentPage, formData, isFieldVisible]);

  const handleNext = useCallback(() => {
    if (validatePage()) {
      setCurrentPage((prev) => Math.min(prev + 1, ast.pages.length - 1));
    }
  }, [validatePage, ast.pages.length]);

  const handlePrevious = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (validatePage()) {
        onSubmit(formData);
      }
    },
    [validatePage, formData, onSubmit]
  );

  const currentPageData = ast.pages[currentPage];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === ast.pages.length - 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Page indicator */}
      {ast.pages.length > 1 && (
        <div className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {ast.pages.length}
        </div>
      )}

      {/* Status Banners */}
      {isVoided && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Form Voided</h3>
              <p className="text-sm text-red-700">This form has been voided and is no longer accessible.</p>
            </div>
          </div>
        </div>
      )}

      {isCompleted && !isVoided && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Form Completed</h3>
              <p className="text-sm text-green-700">This form has been completed and is now read-only.</p>
            </div>
          </div>
        </div>
      )}

      {isLocked && !isCompleted && !isVoided && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-yellow-500 flex items-center justify-center">
              <span className="text-white text-xs">🔒</span>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800">Form Locked</h3>
              <p className="text-sm text-yellow-700">This form has been locked because someone has signed it. Form data can no longer be modified. You can still sign if you are a signatory.</p>
            </div>
          </div>
        </div>
      )}

      {/* Form description (show on first page) */}
      {currentPage === 0 && ast.description && (
        <div className="space-y-2">
          <p className="text-muted-foreground">{ast.description}</p>
        </div>
      )}

      {/* Signatory Status Panel */}
      {formInstance && signatories.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Signatory Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Required fields completed</span>
                  <span className={isReadyToSign() ? "text-primary font-semibold" : "text-muted-foreground"}>
                    {isReadyToSign() ? "Ready to sign" : "Complete required fields"}
                  </span>
                </div>
                <Progress 
                  value={isReadyToSign() ? 100 : 0} 
                  className="h-2"
                />
              </div>

              {/* Signatory list */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">Signatories</div>
                <div className="space-y-1">
                  {signatories.map((signatory) => (
                    <div key={signatory.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {signatory.signedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{signatory.signatoryName}</span>
                        {signatory.id === currentSignatory && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      {signatory.signedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(signatory.signedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Signing mode info */}
              <div className="text-xs text-muted-foreground">
                {formInstance.signingMode === "all" 
                  ? "All signatories must sign to complete the form"
                  : "Any signatory can sign to complete the form"
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections on current page */}
      <div className="space-y-8">
        {currentPageData.sections.map((section) => (
          <div key={section.id} className="space-y-6">
            {section.title && <h2 className="text-lg font-semibold">{section.title}</h2>}
            {section.description && (
              <div className="space-y-3">
                {section.description.split(/\n\s*\n/).filter(p => p.trim()).map((paragraph, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">{paragraph.trim()}</p>
                ))}
              </div>
            )}

            {/* Fields in section */}
            <div className="space-y-5">
              {section.fields.map((container, idx) => (
                <FormFieldContainer
                  key={`${section.id}-${idx}`}
                  container={container}
                  formData={formData}
                  errors={errors}
                  isVisible={
                    container.type === "conditional"
                      ? isFieldVisible(container.condition)
                      : true
                  }
                  onInputChange={handleInputChange}
                  isFieldVisible={isFieldVisible}
                  isReadyToSign={isReadyToSign}
                  checkAllSignaturesCompleted={checkAllSignaturesCompleted}
                  ast={ast}
                  onSubmit={onSubmit}
                  initialData={initialData}
                  disabled={isLocked || isCompleted || isVoided}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstPage || isLoading}
          className="border-primary text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {!isLastPage && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Next
            </Button>
          )}
          {isLastPage && !(ast.metadata?.formConfig?.autoSubmitOnSignature && checkAllSignaturesCompleted()) && (
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          )}
          {isLastPage && ast.metadata?.formConfig?.autoSubmitOnSignature && checkAllSignaturesCompleted() && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>All signatures completed - form will auto-submit</span>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

interface FormFieldContainerProps {
  container: FieldContainer;
  formData: Record<string, any>;
  errors: Record<string, string>;
  isVisible: boolean;
  onInputChange: (fieldId: string, value: any) => void;
  isFieldVisible: (condition: any) => boolean;
  isReadyToSign: () => boolean;
  checkAllSignaturesCompleted: () => boolean;
  ast: any;
  onSubmit: (data: any) => void;
  initialData: any;
  disabled?: boolean;
}

const FormFieldContainer: React.FC<FormFieldContainerProps> = ({
  container,
  formData,
  errors,
  isVisible,
  onInputChange,
  isFieldVisible,
  isReadyToSign,
  checkAllSignaturesCompleted,
  ast,
  onSubmit,
  initialData,
  disabled = false,
}) => {
  if (!isVisible) return null;

  if (container.type === "divider") {
    return <hr className="my-4" />;
  }

  if (container.type === "conditional") {
    return (
      <>
        {container.children.map((child, idx) => (
          <FormFieldContainer
            key={idx}
            container={child}
            formData={formData}
            errors={errors}
            isVisible={isFieldVisible(container.condition)}
            onInputChange={onInputChange}
            isFieldVisible={isFieldVisible}
            isReadyToSign={isReadyToSign}
            checkAllSignaturesCompleted={checkAllSignaturesCompleted}
            ast={ast}
            onSubmit={onSubmit}
            initialData={initialData}
            disabled={disabled}
          />
        ))}
      </>
    );
  }

  const field = container as Field;
  const value = formData[field.id];
  const error = errors[field.id];

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id} className="font-semibold">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}

      {renderFieldInput(field, value, error, onInputChange, isReadyToSign, checkAllSignaturesCompleted, ast, onSubmit, formData, initialData, disabled)}

      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

function renderFieldInput(
  field: Field,
  value: any,
  error: string | undefined,
  onChange: (id: string, value: any) => void,
  isReadyToSign: () => boolean,
  checkAllSignaturesCompleted: () => boolean,
  ast: any,
  onSubmit: (data: any) => void,
  formData: any,
  initialData: any,
  disabled: boolean = false
): React.ReactNode {
  const commonProps = {
    id: field.id,
    placeholder: field.placeholder,
    disabled: disabled,
  };

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          {...commonProps}
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
          rows={4}
        />
      );

    case "email":
    case "text":
      return (
        <Input
          {...commonProps}
          type={field.type}
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
        />
      );

    case "number":
      return (
        <Input
          {...commonProps}
          type="number"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value ? Number(e.target.value) : "")}
          min={(field as any).min}
          max={(field as any).max}
          step={(field as any).step}
          className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
        />
      );

    case "currency":
      // Format currency for display with separators
      const formatCurrency = (amount: number | string) => {
        if (!amount || amount === "") return "";
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(num)) return "";
        return new Intl.NumberFormat("en-NZ", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(num);
      };

      // Parse currency from formatted string
      const parseCurrency = (formattedValue: string) => {
        if (!formattedValue) return "";
        // Remove all non-numeric characters except decimal point
        const cleanValue = formattedValue.replace(/[^\d.]/g, "");
        const num = parseFloat(cleanValue);
        return isNaN(num) ? "" : num;
      };

      const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const numericValue = parseCurrency(inputValue);
        onChange(field.id, numericValue);
      };

      const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const currentValue = parseCurrency(e.currentTarget.value) || 0;
          const newValue = currentValue + 10000;
          onChange(field.id, newValue);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const currentValue = parseCurrency(e.currentTarget.value) || 0;
          const newValue = Math.max(0, currentValue - 10000);
          onChange(field.id, newValue);
        }
      };

      return (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">$</span>
          <Input
            {...commonProps}
            type="text"
            value={formatCurrency(value || "")}
            onChange={handleCurrencyChange}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
          />
          <div className="text-xs text-muted-foreground">
            <div>↑↓ $10,000</div>
          </div>
        </div>
      );

    case "date":
      return (
        <Input
          {...commonProps}
          type="date"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
        />
      );

    case "time":
      return (
        <Input
          {...commonProps}
          type="time"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
        />
      );

    case "datetime" as any:
      // Handle datetime fields - format for NZT display
      const formatDateTimeForDisplay = (dateTimeStr: string) => {
        if (!dateTimeStr) return "";
        try {
          const date = new Date(dateTimeStr);
          // Convert to NZT (UTC+12) and format for display
          const nztDate = new Date(date.getTime() + (12 * 60 * 60 * 1000));
          return nztDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
        } catch {
          return "";
        }
      };

      const formatDateTimeForStorage = (dateTimeStr: string) => {
        if (!dateTimeStr) return "";
        try {
          // Convert from local datetime to UTC for storage
          const date = new Date(dateTimeStr);
          return date.toISOString();
        } catch {
          return "";
        }
      };

      return (
        <div className="space-y-2">
          <Input
            {...commonProps}
            type="datetime-local"
            value={formatDateTimeForDisplay(value || "")}
            onChange={(e) => onChange((field as any).id, formatDateTimeForStorage(e.target.value))}
            className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}
          />
          <p className="text-xs text-muted-foreground">Time shown in New Zealand Time (NZT)</p>
        </div>
      );

    case "select": {
      const selectField = field as SelectField;
      return (
        <Select value={value || ""} onValueChange={(val) => onChange(field.id, val)}>
          <SelectTrigger className={`rounded-lg ${error ? "border-red-500" : ""} focus-visible:ring-2 focus-visible:ring-ring`}>
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {selectField.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "radio": {
      const radioField = field as SelectField;
      return (
        <RadioGroup value={value || ""} onValueChange={(val) => onChange(field.id, val)}>
          <div className="space-y-2">
            {radioField.options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
                <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer font-normal">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      );
    }

    case "checkbox": {
      const checkField = field as SelectField;
      const checked = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {checkField.options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={`${field.id}-${opt.value}`}
                checked={checked.includes(opt.value)}
                onCheckedChange={(isChecked) => {
                  const newValue = isChecked
                    ? [...checked, opt.value]
                    : checked.filter((v) => v !== opt.value);
                  onChange(field.id, newValue);
                }}
              />
              <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "signature": {
      const signatureField = field as SignatureField;
      
      // Resolve signatory name from chip data
      let resolvedSignatory = signatureField.signatory;
      if (signatureField.signatory === "vendor.name" && formData.vendorName1) {
        resolvedSignatory = formData.vendorName1;
      } else if (signatureField.signatory === "vendor.name" && initialData.vendor?.name) {
        resolvedSignatory = initialData.vendor.name;
      }
      
      return (
        <SignatureFieldComponent
          id={field.id}
          label={field.label}
          required={field.required}
          signatory={resolvedSignatory}
          value={value}
          onChange={(signatureData) => onChange(field.id, signatureData)}
          disabled={disabled || !isReadyToSign()}
          captureTimestamp={signatureField.captureTimestamp}
          timestampFormat={signatureField.timestampFormat}
          embedTimestamp={signatureField.embedTimestamp}
          onSignatureConfirmed={() => {
            // Check if all signatures are completed and auto-submit
            setTimeout(() => {
              const allSignaturesCompleted = checkAllSignaturesCompleted();
              if (allSignaturesCompleted && ast.metadata?.formConfig?.autoSubmitOnSignature) {
                onSubmit(formData);
              }
            }, 100);
          }}
        />
      );
    }

    default:
      return null;
  }
}
