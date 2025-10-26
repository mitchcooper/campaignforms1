# Form Components Documentation

## Overview

Two React components handle form creation and rendering:

1. **`FormTemplateEditor`** - Markdown editor for creating/editing form templates
2. **`DynamicFormRenderer`** - Interactive form renderer that displays templates to users

Both components use the shared `template-parser` for validation and rendering.

---

## FormTemplateEditor

**Location:** `client/src/components/form-template-editor.tsx`

### Purpose

A professional markdown editor with live preview for creating and editing form templates. Includes syntax highlighting, quick-insert buttons, real-time validation, and help documentation.

### Props

```typescript
interface FormTemplateEditorProps {
  initialTemplate?: string;                    // Template to edit (optional)
  onSave?: (template: string, ast: FormAST) => void;  // Save callback
  onError?: (errors: ValidationError[]) => void;      // Error callback
  readOnly?: boolean;                          // Make editor read-only
}
```

### Usage

#### Basic Example

```tsx
import { FormTemplateEditor } from "@/components/form-template-editor";

export function FormBuilder() {
  const handleSave = (template, ast) => {
    // Save to API
    apiRequest("POST", "/api/forms", {
      title: "My Form",
      template,
      ast
    });
  };

  return (
    <FormTemplateEditor
      initialTemplate=""
      onSave={handleSave}
    />
  );
}
```

#### With Error Handling

```tsx
function FormBuilder() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleSave = (template, ast) => {
    if (errors.length === 0) {
      saveForm(template, ast);
    }
  };

  return (
    <FormTemplateEditor
      initialTemplate={form?.template}
      onSave={handleSave}
      onError={setErrors}
    />
  );
}
```

#### Read-Only Mode

```tsx
// Display template without editing
<FormTemplateEditor
  initialTemplate={form.template}
  readOnly={true}
/>
```

### Features

#### 1. Markdown Editor Panel
- **Syntax highlighting** for markdown structure
- **Line numbers** for error reference
- **Tab support** for indentation
- **Monospace font** for code readability
- **Full height** resizable

#### 2. Live Preview Panel
- **Real-time rendering** as user types
- **Structural HTML** showing form layout
- **Disabled if errors** (shows error details instead)
- **Styled form preview** with basic CSS
- **Side-by-side layout** on desktop, stacked on mobile

#### 3. Validation Feedback
- **Green checkmark** if valid
- **Red error count** if invalid
- **Line numbers** in error messages
- **Inline error display** in preview area

#### 4. Quick Insert Buttons
- **+ Text Field** - Basic text input
- **+ Currency Field** - Number with currency formatting
- **+ Dropdown** - Select field with options
- **+ Divider** - Visual separator

Each button inserts template snippet at cursor position.

#### 5. Syntax Help
- **Template syntax guide** below editor
- **Field type examples** with explanations
- **Key abbreviations** quick reference
- **Common patterns** documentation

### Styling & Layout

```
┌─ FormTemplateEditor ─────────────────────────────┐
│                                                   │
│  [+ Text] [+ Currency] [+ Dropdown] [+ Divider]  │
│  Valid checkbox  [Reset] [Save Form]             │
│                                                   │
│  ┌─ Editor Tab ──┬─ Preview Tab ─┐             │
│  │               │                │             │
│  │ Markdown      │ Form Preview   │             │
│  │ Editor        │ (HTML Output)  │             │
│  │               │                │             │
│  │               │                │             │
│  │               │                │             │
│  └───────────────┴────────────────┘             │
│                                                   │
│  [Syntax Help & Documentation]                  │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Form Preview Styles

The preview panel includes embedded CSS for:
- Form titles and descriptions
- Section headings
- Field labels and required indicators
- Input fields and buttons
- Option groups (radio, checkbox)
- Dividers
- Help text and descriptions

All styles are inline to work without external CSS.

### Error Display

When template has errors:

```
┌─ Preview Tab (Disabled) ─────────────┐
│  🔴 Template Errors                  │
│  ✗ Form must have a title            │
│  ✗ Field must have a label           │
│  ✗ Select field must have options    │
└──────────────────────────────────────┘
```

### Default Template

```markdown
# Property Inquiry Form
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
```

### API Integration

**Save Form:**
```tsx
const handleSave = async (template, ast) => {
  try {
    const response = await apiRequest("PATCH", `/api/forms/${formId}`, {
      template,
      ast,
      version: form.version + 1
    });

    toast({
      title: "Form saved",
      description: "Template updated successfully"
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save template",
      variant: "destructive"
    });
  }
};
```

---

## DynamicFormRenderer

**Location:** `client/src/components/dynamic-form-renderer.tsx`

### Purpose

Renders a parsed form template (AST) as an interactive HTML form. Handles field rendering, validation, conditional visibility, and multi-page navigation.

### Props

```typescript
interface DynamicFormRendererProps {
  ast: FormAST;                              // Parsed template AST
  onSubmit: (data: Record<string, any>) => void;  // Submit callback
  isLoading?: boolean;                       // Show loading state
  initialData?: Record<string, any>;         // Pre-fill form
}
```

### Usage

#### Basic Example

```tsx
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";
import { parseTemplate } from "@shared/template-parser";

export function VendorForm() {
  const [ast, setAST] = useState(null);

  useEffect(() => {
    // Load and parse template
    const { ast } = parseTemplate(formTemplate);
    setAST(ast);
  }, []);

  const handleSubmit = async (formData) => {
    await apiRequest("POST", "/api/submissions", {
      formId,
      campaignId,
      vendorId,
      data: formData
    });
  };

  if (!ast) return <Loading />;

  return (
    <DynamicFormRenderer
      ast={ast}
      onSubmit={handleSubmit}
    />
  );
}
```

#### With Pre-fill

```tsx
// Get form with data injection
const response = await apiRequest(
  "GET",
  `/api/links/resolve?token=${token}`
);

const { formAST, prefill } = response;

<DynamicFormRenderer
  ast={formAST}
  onSubmit={handleSubmit}
  initialData={prefill}
/>
```

#### With Loading State

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (data) => {
  setIsSubmitting(true);
  try {
    await submitForm(data);
  } finally {
    setIsSubmitting(false);
  }
};

<DynamicFormRenderer
  ast={ast}
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
/>
```

### Features

#### 1. Field Types

Supports all field types from template system:

| Type | Component | Behavior |
|------|-----------|----------|
| `text` | Text input | Single-line text |
| `email` | Email input | Email validation |
| `number` | Number input | Integer only |
| `currency` | Currency input | Two decimals, currency symbol |
| `date` | Date picker | Date selection |
| `time` | Time picker | Time selection |
| `textarea` | Text area | Multi-line text |
| `select` | Dropdown | Single selection |
| `radio` | Radio group | Single selection with buttons |
| `checkbox` | Checkbox group | Multiple selection |

#### 2. Multi-Page Navigation

For forms with `---page-break---`:

```
┌─ Page 1 of 3 ─────────────────────┐
│                                    │
│ [Form Fields]                      │
│                                    │
│ [Previous] [Next]                  │
└────────────────────────────────────┘

// User clicks Next →

┌─ Page 2 of 3 ─────────────────────┐
│                                    │
│ [Form Fields]                      │
│                                    │
│ [Previous] [Next]                  │
└────────────────────────────────────┘

// Last page shows Submit instead of Next
│ [Previous] [Submit]                │
```

**Navigation Rules:**
- Previous button disabled on first page
- Next button disabled if page validation fails
- Submit button only on last page
- Validation runs when moving pages

#### 3. Conditional Field Visibility

Fields with `- if: condition` are shown/hidden based on other field values:

```markdown
### Interest Level
- field: interestLevel
- type: radio
- options: High, Medium, Low

- if: interestLevel == "High"
  - label: "Best time to call"
  - field: bestTime
```

**User Interaction:**
1. User selects "High" for Interest Level
2. "Best time to call" field appears
3. User changes to "Medium"
4. "Best time to call" field disappears

**Supported Operators:**
- `==` (equals)
- `!=` (not equals)
- `>` (greater than)
- `<` (less than)
- `>=` (greater than or equal)
- `<=` (less than or equal)
- `in` (value in list)
- `contains` (string contains)

#### 4. Client-Side Validation

Validates on page transitions and submission:

**Validation Rules:**
- ✓ Required fields not empty
- ✓ Text fields within min/max length
- ✓ Email fields valid email format
- ✓ Number fields valid numbers and ranges
- ✓ Select/radio/checkbox valid options

**Error Display:**
```
┌─ Form Field ──────────────────┐
│ Label *                        │
│ [Input]                        │
│ ⚠️ This field is required      │
└────────────────────────────────┘
```

**Validation Timing:**
- Real-time: Clear error when user starts typing
- On blur: Validate field when focus lost
- Page transition: Full page validation required
- Submit: Final validation before onSubmit

#### 5. Form State Management

```tsx
const [formData, setFormData] = useState<Record<string, any>>(initialData);
const [errors, setErrors] = useState<Record<string, string>>({});
const [currentPage, setCurrentPage] = useState(0);
```

**Data Structure:**
```typescript
formData = {
  "fullName": "John Smith",
  "email": "john@example.com",
  "budget": 500000,
  "interestLevel": "high",
  "propertyType": "house",
  "featuresOfInterest": ["pool", "garage"]  // For checkboxes
}
```

### Styling & Layout

The component uses Radix UI components for consistent styling:
- `Button` - Navigation buttons
- `Input` - Text inputs
- `Textarea` - Multi-line text
- `Select` - Dropdown menus
- `RadioGroup` - Radio buttons
- `Checkbox` - Checkboxes
- `Label` - Field labels

Default styling includes:
- Form spacing (8 units between fields)
- Required indicators (red asterisk)
- Error messages (red text)
- Help text (muted color, small font)
- Disabled states (gray, not clickable)

### Complete Rendering Example

```tsx
// Input
const ast = {
  title: "Contact Form",
  pages: [{
    sections: [{
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          required: true
        }
      ]
    }]
  }]
};

// Output
<form onSubmit={handleSubmit}>
  <h1>Contact Form</h1>

  <div className="form-field">
    <label htmlFor="name">
      Name
      <span className="required">*</span>
    </label>
    <input
      id="name"
      name="name"
      type="text"
      required
      value={formData.name}
      onChange={e => handleInputChange("name", e.target.value)}
    />
    {errors.name && <p className="error">{errors.name}</p>}
  </div>

  <div className="navigation">
    <button type="button" disabled={isFirstPage}>Previous</button>
    {isLastPage ? (
      <button type="submit" disabled={isLoading}>Submit</button>
    ) : (
      <button type="button" onClick={handleNext}>Next</button>
    )}
  </div>
</form>
```

### API Integration

**On Submit:**
```tsx
const handleFormSubmit = async (formData: Record<string, any>) => {
  try {
    const response = await apiRequest("POST", "/api/submissions", {
      formId: "form-123",
      campaignId: "campaign-456",
      vendorId: "vendor-789",
      data: formData
    });

    console.log("Submission successful:", response);
    // Show success message or redirect
  } catch (error) {
    console.error("Submission failed:", error);
    // Show error message
  }
};
```

**Server Response:**
```json
{
  "id": "submission-001",
  "formId": "form-123",
  "data": {
    "name": "John Smith",
    "email": "john@example.com"
  },
  "status": "submitted",
  "startedAt": "2024-10-22T10:00:00Z",
  "completedAt": "2024-10-22T10:05:00Z"
}
```

---

## Integration Example: Complete Flow

### 1. Admin Creates Form

```tsx
// FormBuilder page
<FormTemplateEditor
  initialTemplate=""
  onSave={async (template, ast) => {
    const response = await apiRequest("POST", "/api/forms", {
      title: "Property Inquiry",
      description: "Ask about this property",
      template
    });

    navigate(`/forms/${response.id}/builder`);
  }}
/>
```

### 2. Admin Sends Form to Vendors

```tsx
// Campaign manage page
const handleSendForm = async (formId) => {
  const response = await apiRequest("POST", "/api/links/issue", {
    vendorId: "vendor-123",
    campaignId: "campaign-456",
    formId
  });

  const { url } = response;
  // Copy or send url to vendor
};
```

### 3. Vendor Fills Form

```tsx
// Vendor form page (public, no auth)
useEffect(() => {
  const loadForm = async () => {
    const { formAST, prefill } = await apiRequest(
      "GET",
      `/api/links/resolve?token=${token}`
    );

    setFormAST(formAST);
    setPrefill(prefill);
  };

  loadForm();
}, [token]);

<DynamicFormRenderer
  ast={formAST}
  onSubmit={handleSubmit}
  initialData={prefill}
/>
```

### 4. Vendor Submits

```tsx
const handleSubmit = async (formData) => {
  const response = await apiRequest("POST", "/api/submissions", {
    formId,
    campaignId,
    vendorId,
    data: formData
  });

  setSubmitted(true);
  // Show success message
};
```

### 5. Admin Views Submissions

```tsx
// Submissions page
const { data: submissions } = useQuery({
  queryKey: ["/api/submissions", { campaignId }]
});

submissions.map(submission => (
  <div key={submission.id}>
    <pre>{JSON.stringify(submission.data, null, 2)}</pre>
  </div>
))
```

---

## Accessibility

Both components include accessibility features:

### FormTemplateEditor
- ✓ Keyboard navigation (Tab through buttons)
- ✓ ARIA labels on editor textarea
- ✓ Error message announcements

### DynamicFormRenderer
- ✓ `<label>` elements linked to inputs
- ✓ Required indicator with `required` attribute
- ✓ Error messages associated with fields
- ✓ Semantic HTML form structure
- ✓ Keyboard navigation support
- ✓ Focus management on page transitions

---

## Performance Considerations

### FormTemplateEditor
- Real-time parsing: debounced on keystroke
- Preview only updates when AST changes
- No re-renders on user input (controlled component)

### DynamicFormRenderer
- Field visibility computed on each render
- Conditional checking: O(n) where n = # of conditions
- For large forms (100+ fields), consider memoization:

```tsx
const MemoField = React.memo(({ field, visible, ...props }) => {
  if (!visible) return null;
  return <FormField {...props} />;
});
```

---

## Debugging

### Enable Debug Logging

```tsx
// In component
useEffect(() => {
  console.log("AST:", ast);
  console.log("Form Data:", formData);
  console.log("Errors:", errors);
  console.log("Current Page:", currentPage);
}, [ast, formData, errors, currentPage]);
```

### Check Conditional Logic

```tsx
const isVisible = (condition) => {
  const fieldValue = formData[condition.field];
  // Add logging
  console.log(
    `${condition.field} ${condition.operator} ${condition.value}`,
    `Value: ${fieldValue}`,
    `Result: ${checkCondition(fieldValue, condition)}`
  );
};
```

### Test Validation

```tsx
const result = schema.safeParse(formData);
if (!result.success) {
  console.log("Validation errors:", result.error.issues);
}
```

---

## See Also

- **Template Parser:** `shared/template-parser.ts` - AST generation
- **Template Processor:** `server/template-processor.ts` - Server compilation
- **Full Guide:** `TEMPLATE_SYSTEM.md` - Complete system documentation
- **Template Examples:** `FormTemplateEditor` default template
