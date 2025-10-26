# Custom Form Template System

## Overview

This document describes the new custom form templating system that replaces SurveyJS. The system consists of three main components:

1. **Template Parser** (`shared/template-parser.ts`) - Parses markdown templates into AST
2. **Template Processor** (`server/template-processor.ts`) - Handles compilation, validation, and rendering
3. **Form Components** - React components for editing and rendering forms

## Template Language Specification

### Syntax Overview

The template language is markdown-inspired and easy to read/write:

```markdown
# Form Title
Form description (optional)

## Section Name
Section description (optional)

### Field Name
- label: "Display Label"
- field: fieldName
- type: text (optional, default: text)
- required: true
- placeholder: "Enter value"
- chip: vendor.name (optional, for auto-fill)
- description: "Help text"
- helpText: "Additional info"

---  # Divider

- if: fieldName == "value"
  - label: "Conditional Field"
  - field: conditionalField

---page-break---  # Page break for multi-page forms
```

### Field Types

| Type | HTML Input | Notes |
|------|-----------|-------|
| `text` | `<input type="text">` | Default type |
| `email` | `<input type="email">` | Validated as email |
| `number` | `<input type="number">` | Integer input |
| `currency` | `<input type="number">` | With step=0.01, currency formatting |
| `date` | `<input type="date">` | Date picker |
| `time` | `<input type="time">` | Time picker |
| `datetime` | `<input type="datetime-local">` | Date and time picker (NZT) |
| `textarea` | `<textarea>` | Multi-line text |
| `select` | `<select>` | Dropdown with options |
| `radio` | Radio buttons | Single selection from options |
| `checkbox` | Checkboxes | Multiple selections from options |
| `signature` | Canvas + Typed input | Digital signature field |

### Field Properties

```
label (string, required)
  Display label for the field

field (string, required if not auto-generated from label)
  HTML name and JavaScript key for form data

type (string, optional, default: text)
  Field type from list above

required (boolean, optional, default: false)
  Whether the field must be filled

placeholder (string, optional)
  Placeholder text for input fields

chip (string, optional)
  Data source reference for auto-fill: vendor.name, campaign.status, listing.price

description (string, optional)
  Longer description shown above the field

helpText (string, optional)
  Small help text shown below the field

options (comma-separated string, for select/radio/checkbox)
  Example: "Option 1, Option 2, Option 3"

minLength (number, optional, for text fields)
  Minimum character count

maxLength (number, optional, for text fields)
  Maximum character count

min (number, optional, for number/currency fields)
  Minimum value

max (number, optional, for number/currency fields)
  Maximum value

step (number, optional, for number/currency fields)
  Step increment

signatory (string, optional, for signature fields)
  Pre-assign signature to specific signatory
```

### Signature Fields

Signature fields enable digital signatures in forms. They support both canvas drawing and typed signatures:

```markdown
### Your Signature
- label: "Digital Signature"
- field: signature
- type: signature
- required: true
- signatory: "John Smith"  # Optional: pre-assign to specific signatory
- captureTimestamp: true
- timestampFormat: "d MMM yyyy, h:mm a zzz"
- embedTimestamp: true
```

**Signature Field Properties:**
- `type: signature` - Required for signature fields
- `required: true` - Signature fields are always required
- `signatory: "Name"` - Optional: pre-assign to specific signatory
- `captureTimestamp: true` - Automatically capture timestamp when signed
- `timestampFormat: "d MMM yyyy, h:mm a zzz"` - Format for embedded timestamp (e.g., "24 Oct 2025, 3:45 PM NZST")
- `embedTimestamp: true` - Display timestamp within the signature field itself

**Signature Data Format:**
```typescript
{
  type: "canvas" | "typed",
  data: string, // Base64 canvas data or typed name
  timestamp: string, // ISO timestamp
  signatory?: string, // Optional signatory name
  signingDate?: string // Today's date in YYYY-MM-DD format (auto-populated)
}
```

### Form Instances and Multi-Signatory Forms

When a form contains signature fields, it can be sent to multiple signatories:

1. **Form Instance**: Shared form state that all signatories can access
2. **Signatories**: List of people who need to sign the form
3. **Signing Modes**:
   - `all`: All signatories must sign to complete the form
   - `any`: Any signatory can sign to complete the form

**Form Instance Properties:**
- `data`: Shared field values (all signatories see the same data)
- `status`: `draft` | `ready_to_sign` | `partially_signed` | `completed`
- `signingMode`: `all` | `any`

### Conditional Fields

Show/hide fields based on other field values:

```markdown
- if: fieldName == "value"
  - label: "Conditional Field"
  - field: conditionalField
```

**Operators:**
- `==` - Equals
- `!=` - Not equals
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `in` - Value in list
- `contains` - String contains

### Chip References (Auto-fill)

Chips allow fields to be pre-filled with data from API sources:

```markdown
### Property Price
- field: price
- chip: listing.salePrice

### Vendor Name
- field: vendorName
- chip: vendor.name
```

**Available Chip Sources:**

```
vendor.*
  - vendor.name
  - vendor.email
  - vendor.phone
  - vendor.meta.* (custom fields)

campaign.*
  - campaign.name
  - campaign.status
  - campaign.manualAddress
  - campaign.listingId

listing.* (Cooper API data)
  - listing.displayAddress
  - listing.salePrice
  - listing.bedrooms
  - listing.bathrooms
  - listing.propertyTypeName
  - listing.internetPrice
```

### Multi-page Forms

Separate pages with `---page-break---`:

```markdown
# Property Inquiry Form

## Page 1
### Name
- field: name
- required: true

---page-break---

## Page 2
### Budget
- field: budget
- type: currency
- required: true
```

### Complete Example

```markdown
# Vendor Inquiry Form
Please provide your information for our spring campaign

## Personal Details

### Full Name
- label: "Your Name"
- field: fullName
- required: true
- placeholder: "John Smith"
- chip: vendor.name

### Email Address
- label: "Email"
- field: email
- type: email
- required: true
- chip: vendor.email

### Phone Number
- label: "Phone"
- field: phone
- required: false
- chip: vendor.phone

---

## Property Interest

### Property Address
- label: "Property Address"
- field: address
- type: textarea
- chip: listing.displayAddress

### Asking Price
- label: "Listed Price"
- field: listedPrice
- type: currency
- chip: listing.salePrice

### Interest Level
- label: "How interested are you?"
- field: interestLevel
- type: radio
- required: true
- options: Very Interested, Somewhat Interested, Just Browsing

---page-break---

## Additional Information

### Preferred Contact Method
- label: "How should we contact you?"
- field: contactMethod
- type: select
- required: true
- options: Email, Phone, SMS

### Follow-up Needed
- label: "Want follow-up information?"
- field: followup
- type: checkbox
- options: Floor plans, Property history, Market analysis

- if: interestLevel == "Very Interested"
  - label: "Best time to call"
  - field: bestTimeToCall
  - type: select
  - options: Morning, Afternoon, Evening
```

---

## Shared Module: `shared/template-parser.ts`

The template parser is a shared utility used by both client and server to parse, validate, and render form templates.

### Key Types

```typescript
interface FormAST {
  title: string;
  description?: string;
  pages: Page[];
  metadata: {
    version: number;
    createdAt?: Date;
    chipReferences: string[];
  };
}

interface Page {
  id: string;
  sections: Section[];
}

interface Section {
  id: string;
  title?: string;
  description?: string;
  fields: FieldContainer[];
}

type Field = TextField | SelectField;

interface ConditionalBlock {
  type: "conditional";
  condition: Condition;
  children: FieldContainer[];
}

interface Divider {
  type: "divider";
}

type FieldContainer = Field | ConditionalBlock | Divider;
```

### API Functions

#### `parseTemplate(markdown: string)`

Parses markdown template to AST.

```typescript
const { ast, errors } = parseTemplate(template);

if (errors.length > 0) {
  console.error("Validation errors:", errors);
}
```

**Returns:**
```typescript
{
  ast: FormAST,
  errors: ValidationError[]
}
```

#### `renderTemplate(ast: FormAST)`

Renders AST to HTML (without data injection).

```typescript
const html = renderTemplate(ast);
// Returns: <form class="form-template">...</form>
```

#### `renderWithData(ast: FormAST, context: ChipContext)`

Renders AST with data injected from context.

```typescript
const html = renderWithData(ast, {
  vendor: { name: "John Smith", email: "john@example.com" },
  campaign: { name: "Spring Campaign" },
  listing: { salePrice: 500000 }
});
```

#### `getSubmissionSchema(ast: FormAST)`

Returns a Zod schema for validating form submissions.

```typescript
const schema = getSubmissionSchema(ast);
const result = schema.safeParse(submissionData);

if (!result.success) {
  console.error("Validation errors:", result.error.issues);
}
```

### Classes

#### `TemplateParser`

Parses markdown strings into FormAST objects.

```typescript
const parser = new TemplateParser(markdownString);
const ast = parser.parse();
```

#### `TemplateValidator`

Validates FormAST for correctness.

```typescript
const validator = new TemplateValidator();
const errors = validator.validate(ast);
```

#### `TemplateRenderer`

Renders FormAST to HTML.

```typescript
const renderer = new TemplateRenderer();
const html = renderer.renderHTML(ast);
```

#### `DataInjector`

Injects chip data into FormAST.

```typescript
const injector = new DataInjector();
const injectedAST = injector.injectData(ast, context);
```

---

## Server Module: `server/template-processor.ts`

Server-side template processing with caching and validation.

### Key Types

```typescript
interface CompiledForm {
  templateMarkdown: string;
  ast: FormAST;
  htmlPreview: string;
  validator: ZodSchema;
  chipReferences: string[];
  errors: ValidationError[];
  isValid: boolean;
}

interface RenderedForm {
  html: string;
  hiddenFields?: Record<string, any>;
  pageCount: number;
}

interface SubmissionValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  normalizedData?: Record<string, any>;
}

interface ChipContext {
  vendor?: Record<string, any>;
  campaign?: Record<string, any>;
  listing?: Record<string, any>;
}
```

### API Functions

#### `compileTemplate(markdown: string): CompiledForm`

Compiles and validates a markdown template. Use this when creating or updating forms.

```typescript
const compiled = compileTemplate(templateMarkdown);

if (!compiled.isValid) {
  console.error("Template errors:", compiled.errors);
  return;
}

// Save to database
const form = await storage.createForm({
  template: templateMarkdown,
  ast: compiled.ast,
  htmlPreview: compiled.htmlPreview,
});
```

#### `renderFormWithData(compiled: CompiledForm, context: ChipContext): RenderedForm`

Renders a compiled form with chip data injected.

```typescript
const rendered = renderFormWithData(compiled, {
  vendor: { name: "Smith", email: "smith@example.com" },
  campaign: { name: "Spring 2024" },
  listing: { salePrice: 850000 }
});

res.json({
  formAST: rendered.ast,
  html: rendered.html,
  pageCount: rendered.pageCount
});
```

#### `validateSubmission(compiled: CompiledForm, submissionData: Record<string, any>): SubmissionValidationResult`

Validates form submission data against the template schema.

```typescript
const validation = validateSubmission(compiled, formData);

if (!validation.isValid) {
  return res.status(400).json({
    error: "Validation failed",
    details: validation.errors
  });
}

// Use validation.normalizedData for storage
await storage.createSubmission({
  formId,
  campaignId,
  vendorId,
  data: validation.normalizedData,
  templateVersion: form.version
});
```

#### `getOrCompileTemplate(formId: string, markdown: string): CompiledForm`

Gets cached compiled template or compiles if not cached.

```typescript
// Server automatically caches for 1 hour
const compiled = getOrCompileTemplate(formId, template);
```

#### `invalidateTemplateCache(formId: string): void`

Clears cache for a form (call after updating).

```typescript
await updateForm(id, newTemplate);
invalidateTemplateCache(id);
```

#### `getRequiredChips(compiled: CompiledForm): string[]`

Returns list of chip references needed by the template.

```typescript
const chips = getRequiredChips(compiled);
// Returns: ["vendor.name", "listing.salePrice", "campaign.status"]
```

#### `hasAllRequiredChips(compiled: CompiledForm, context: ChipContext): { satisfied: boolean; missing: string[] }`

Checks if all required chips are available.

```typescript
const check = hasAllRequiredChips(compiled, context);
if (!check.satisfied) {
  console.warn("Missing chips:", check.missing);
}
```

---

## React Components

### `FormTemplateEditor`

Text-based markdown template editor with live preview.

**Location:** `client/src/components/form-template-editor.tsx`

**Props:**
```typescript
interface FormTemplateEditorProps {
  initialTemplate?: string;
  onSave?: (template: string, ast: FormAST) => void;
  onError?: (errors: ValidationError[]) => void;
  readOnly?: boolean;
}
```

**Features:**
- Markdown editor with syntax highlighting
- Live preview panel
- Quick insert buttons for field types
- Real-time validation
- Help documentation
- Error highlighting

**Usage:**
```tsx
import { FormTemplateEditor } from "@/components/form-template-editor";

function FormBuilder() {
  const handleSave = (template, ast) => {
    // Save to API
  };

  return (
    <FormTemplateEditor
      initialTemplate={form.template}
      onSave={handleSave}
      onError={handleValidationError}
    />
  );
}
```

### `DynamicFormRenderer`

Renders compiled form AST as interactive form.

**Location:** `client/src/components/dynamic-form-renderer.tsx`

**Props:**
```typescript
interface DynamicFormRendererProps {
  ast: FormAST;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
  initialData?: Record<string, any>;
}
```

**Features:**
- Multi-page pagination
- All field types supported
- Conditional field visibility
- Client-side validation
- Auto-fill from initialData
- Loading states

**Usage:**
```tsx
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";

function VendorForm() {
  const [formAST, setFormAST] = useState(null);

  const handleSubmit = async (data) => {
    await apiRequest("POST", "/api/submissions", {
      formId,
      campaignId,
      vendorId,
      data
    });
  };

  return (
    <DynamicFormRenderer
      ast={formAST}
      onSubmit={handleSubmit}
      initialData={{ vendor_name: "Smith" }}
    />
  );
}
```

---

## API Endpoints

### Form Management

#### `POST /api/forms`
Create a new form from template.

**Request:**
```json
{
  "title": "Vendor Inquiry",
  "description": "Please fill this out",
  "template": "# Vendor Inquiry\n...",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "form-123",
  "title": "Vendor Inquiry",
  "template": "# Vendor Inquiry\n...",
  "ast": { ... },
  "htmlPreview": "<form>...</form>",
  "version": 1,
  "isActive": true,
  "createdAt": "2024-10-22T...",
  "updatedAt": "2024-10-22T..."
}
```

#### `PATCH /api/forms/:id`
Update form template.

**Request:**
```json
{
  "template": "# Updated Template\n...",
  "version": 2
}
```

Automatically invalidates cache and regenerates AST + preview.

#### `GET /api/forms/:id`
Get form details (including AST and preview).

#### `GET /api/links/resolve?token=xyz`
Resolve a form access link (for vendors).

**Response:**
```json
{
  "formId": "form-123",
  "campaignId": "campaign-456",
  "vendorId": "vendor-789",
  "formAST": { ... },
  "formTitle": "Vendor Inquiry",
  "campaignName": "Spring 2024",
  "prefill": {
    "vendor_name": "Smith",
    "vendor_email": "smith@example.com",
    "campaign_name": "Spring 2024"
  }
}
```

### Submissions

#### `POST /api/submissions`
Submit a completed form.

**Request:**
```json
{
  "formId": "form-123",
  "campaignId": "campaign-456",
  "vendorId": "vendor-789",
  "data": {
    "fullName": "John Smith",
    "email": "john@example.com",
    "budget": 500000,
    "interestLevel": "very-interested"
  }
}
```

**Features:**
- Validates against template schema
- Normalizes data
- Tracks template version used
- Returns error details if validation fails

**Response:**
```json
{
  "id": "submission-001",
  "formId": "form-123",
  "campaignId": "campaign-456",
  "vendorId": "vendor-789",
  "data": { ... },
  "templateVersion": 1,
  "status": "submitted",
  "startedAt": "2024-10-22T10:00:00Z",
  "completedAt": "2024-10-22T10:05:30Z"
}
```

---

## Data Flow

### Creating a Form

1. User writes markdown template in `FormTemplateEditor`
2. Editor calls `parseTemplate()` for real-time validation
3. Editor shows errors or preview on save
4. `POST /api/forms` with template markdown
5. Server calls `compileTemplate()`:
   - Parses to AST
   - Validates syntax
   - Generates Zod schema
   - Renders HTML preview
6. Form saved with `template`, `ast`, `htmlPreview`

### Displaying Form to Vendor

1. Vendor clicks form link with `token`
2. Frontend calls `GET /api/links/resolve?token=xyz`
3. Server:
   - Resolves token
   - Loads form template
   - Gets cached compiled template
   - Fetches vendor/campaign/listing data
   - Returns FormAST + prefill data
4. Frontend renders with `DynamicFormRenderer`
5. Fields pre-filled with chip values

### Submitting Form

1. Vendor fills form and clicks submit
2. `DynamicFormRenderer` calls `onSubmit(formData)`
3. Frontend `POST /api/submissions` with data
4. Server:
   - Calls `validateSubmission()` against template schema
   - Returns validation errors if invalid
   - Creates submission with normalized data
   - Tracks template version
5. Frontend shows success message

---

## Migration Guide

### From SurveyJS to Templates

**Before (SurveyJS):**
```typescript
// Stored as complex JSON
const form = {
  json: {
    title: "Form",
    pages: [{
      elements: [{
        type: "text",
        name: "name",
        title: "Name"
      }]
    }]
  }
};
```

**After (Templates):**
```typescript
// Simple markdown
const form = {
  template: `# Form
### Name
- field: name
- required: true`
};
```

**Benefits:**
- ✅ Human-readable source
- ✅ Much smaller file size
- ✅ Easy to version control
- ✅ Simple to understand and modify
- ✅ Supports conditionals out of the box
- ✅ Auto-fill with chip references

---

## Performance Considerations

### Caching Strategy

- Templates are compiled once and cached for 1 hour
- Cache is invalidated on template update
- Compiled templates include validator schema (Zod)
- HTML previews are cached in database

### Database Indexes

Created for common query patterns:
- `idx_submissions_template_version` - Filter by template version
- `idx_submissions_started_at` - Recent submissions
- `idx_submissions_completed_at` - Completed submissions

### Optimization Tips

1. **Precompile templates** - Use `getOrCompileTemplate()` for automatic caching
2. **Reuse validators** - Don't recompile for every submission
3. **Batch validate** - Validate multiple submissions at once
4. **Monitor cache** - Check cache stats with `getTemplateCacheStats()`

---

## Error Handling

### Template Validation Errors

```typescript
const { errors } = parseTemplate(invalidTemplate);

errors.forEach(error => {
  console.error(`Line ${error.line}: ${error.message}`);
});

// Example errors:
// - "Form must have a title (# Title)"
// - "Field fieldName must have a label"
// - "Field status (select) must have options"
```

### Submission Validation Errors

```typescript
const result = validateSubmission(compiled, badData);

if (!result.isValid) {
  // result.errors = {
  //   "fullName": ["fullName is required"],
  //   "email": ["Please enter a valid email"]
  // }
}
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Template doesn't render | Check for SyntaxError in parser output |
| Field not appearing | Check if field has a label |
| Chips not resolving | Verify chip names match available sources |
| Conditional not working | Check operator and value types |

---

## Development Tips

### Testing Templates

Use the form template editor preview to test before saving.

### Debugging Conditionals

Print the condition evaluation:
```typescript
const visible = isFieldVisible({ field: "status", operator: "==", value: "Active" });
console.log("Field visible:", visible);
```

### Template Examples

See `FormTemplateEditor` component for built-in examples and syntax help.

### Adding Custom Field Types

1. Update `FieldType` union in `template-parser.ts`
2. Add rendering logic in `TemplateRenderer.renderInput()`
3. Add validation in `createFieldSchema()`
4. Update documentation above

---

## References

- **Template Parser:** `shared/template-parser.ts` (850+ lines)
- **Template Processor:** `server/template-processor.ts` (200+ lines)
- **Form Editor:** `client/src/components/form-template-editor.tsx`
- **Form Renderer:** `client/src/components/dynamic-form-renderer.tsx`
- **Database Schema:** `shared/schema.ts`
- **API Routes:** `server/routes.ts`
