import React, { useState, useMemo } from "react";
import { parseTemplate, renderTemplate, FormAST, ValidationError } from "@shared/template-parser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";

interface FormTemplateEditorProps {
  initialTemplate?: string;
  onSave?: (template: string, ast: FormAST) => void;
  onError?: (errors: ValidationError[]) => void;
  readOnly?: boolean;
}

export const FormTemplateEditor: React.FC<FormTemplateEditorProps> = ({
  initialTemplate = "",
  onSave,
  onError,
  readOnly = false,
}) => {
  const [template, setTemplate] = useState(initialTemplate);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Parse template and extract errors
  const { ast, errors: parseErrors } = useMemo(() => {
    return parseTemplate(template);
  }, [template]);

  // Invoke onError callback when errors change
  React.useEffect(() => {
    if (onError) {
      onError(parseErrors);
    }
  }, [parseErrors, onError]);

  // Render HTML preview
  const htmlPreview = useMemo(() => {
    if (parseErrors.length > 0) return "";
    try {
      return renderTemplate(ast);
    } catch {
      return "";
    }
  }, [ast, parseErrors]);

  const isValid = parseErrors.length === 0;

  const handleSave = () => {
    if (isValid && onSave) {
      onSave(template, ast);
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    const textarea = document.getElementById("template-editor") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newTemplate = template.slice(0, start) + snippet + template.slice(end);
      setTemplate(newTemplate);
      
      // Focus textarea and set cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + snippet.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-6 bg-muted rounded-lg gap-4">
        <div className="flex-1 flex gap-3">
          <Button
            size="sm"
            variant="outline"
            className="border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            onClick={() =>
              handleInsertSnippet(
                "\n### New Field\n- label: \"Field Label\"\n- field: fieldName\n- required: true\n- placeholder: \"Enter value\"\n"
              )
            }
          >
            + Text Field
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            onClick={() =>
              handleInsertSnippet(
                "\n### Price\n- label: \"Property Price\"\n- field: price\n- type: currency\n- required: true\n"
              )
            }
          >
            + Currency Field
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            onClick={() =>
              handleInsertSnippet(
                "\n### Selection\n- label: \"Choose Option\"\n- field: option\n- type: select\n- required: true\n- options: Option 1, Option 2, Option 3\n"
              )
            }
          >
            + Dropdown
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            onClick={() =>
              handleInsertSnippet(
                "\n### Signature\n- label: \"Your Signature\"\n- field: signature\n- type: signature\n- required: true\n- signatory: \"Signatory Name\"\n"
              )
            }
          >
            + Signature
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            onClick={() => handleInsertSnippet("\n---\n")}
          >
            + Divider
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isValid ? (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Valid
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {parseErrors.length} error{parseErrors.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {parseErrors.length > 0 && (
        <Card className="p-6 border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-2">Template Errors</h3>
              <ul className="space-y-1">
                {parseErrors.map((error, idx) => (
                  <li key={idx} className="text-sm text-destructive/80">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Editor and Preview Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "editor" | "preview")}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview" disabled={!isValid}>
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 flex flex-col">
          <div className="flex-1 border rounded-lg overflow-hidden">
            <textarea
              id="template-editor"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              readOnly={readOnly}
              placeholder={TEMPLATE_PLACEHOLDER}
              className="w-full h-full p-4 font-mono text-sm resize-none bg-background"
            />
          </div>

          <div className="mt-4 text-xs text-muted-foreground space-y-2">
            <div>
              <strong>Template Syntax Help:</strong>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <code className="bg-muted px-2 py-1 rounded"># Title</code> - Form title
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded">## Section</code> - Section
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded">### Field</code> - Field
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded">- chip: vendor.name</code> -
                Auto-fill
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-3xl mx-auto p-6">
              {/* Harcourts Cooper & Co Logo */}
              <div className="mb-8 text-center">
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
                    {ast.title || "Form Preview"}
                  </h1>
                </div>
              </div>

              <Card className="glass border-0 p-6">
                {isValid && ast && (
                  <DynamicFormRenderer
                    ast={ast}
                    onSubmit={() => {}}
                    isLoading={false}
                    initialData={{}}
                  />
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            onClick={() => setTemplate(initialTemplate)}
            disabled={template === initialTemplate}
          >
            Reset
          </Button>
          <Button 
            className="bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary)]/90 focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] disabled:opacity-50"
            onClick={handleSave} 
            disabled={!isValid}
          >
            Save Form
          </Button>
        </div>
      )}

    </div>
  );
};

const TEMPLATE_PLACEHOLDER = `# Property Inquiry Form
Form description goes here

## Personal Information

### Full Name
- label: "Your Full Name"
- field: fullName
- required: true
- placeholder: "John Doe"

### Email Address
- label: "Email"
- field: email
- type: email
- required: true
- placeholder: "john@example.com"

### Phone Number
- label: "Phone"
- field: phone
- required: false
- placeholder: "+64 21 123 4567"

---

## Property Details

### Property Address
- label: "Property Address"
- field: address
- type: textarea
- required: false
- chip: listing.displayAddress

### Interested Price Range
- label: "Budget"
- field: budget
- type: currency
- required: true
- chip: listing.salePrice

### Property Type
- label: "What type of property?"
- field: propertyType
- type: select
- required: true
- options: House, Apartment, Commercial, Land

---page-break---

## Additional Information

### How did you hear about us?
- label: "Referral Source"
- field: referralSource
- type: radio
- required: true
- options: Friend, Online, Agent, Other

### Interest Level
- label: "How interested are you?"
- field: interestLevel
- type: select
- required: true
- options: Very Interested, Somewhat Interested, Just Browsing
`;
