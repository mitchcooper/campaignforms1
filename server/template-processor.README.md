# Template Processor Module (`server/template-processor.ts`)

## Overview

The template processor handles server-side form template processing, including compilation, validation, caching, and rendering with data injection. It bridges the gap between raw markdown templates and the database.

**Key Responsibilities:**
- Compile and validate templates
- Cache compiled forms for performance
- Validate form submissions
- Manage chip data injection
- Track template versions

**Stats:**
- ~250 lines of code
- Depends on: `template-parser.ts`, `zod`
- In-memory LRU cache (1-hour TTL)

## Architecture

```
Template Processor
├── Compiler
│   └── Validates markdown → Generates AST, schema, preview
├── Validator
│   └── Checks submission data against schema
├── Renderer
│   └── Renders with chip data
└── Cache Manager
    └── In-memory template cache (1 hour TTL)
```

## Public API

### Type Definitions

```typescript
interface CompiledForm {
  templateMarkdown: string;           // Original markdown
  ast: FormAST;                       // Parsed AST
  htmlPreview: string;                // Cached HTML (without data)
  validator: ZodType;                 // Zod schema for validation
  chipReferences: string[];           // All chips used
  errors: ValidationError[];          // Parse/validation errors
  isValid: boolean;                   // Is template valid?
}

interface RenderedForm {
  html: string;                       // Rendered HTML with data
  hiddenFields?: Record<string, any>; // Hidden fields (reserved)
  pageCount: number;                  // Number of pages
}

interface SubmissionValidationResult {
  isValid: boolean;                           // Is submission valid?
  errors: Record<string, string[]>;           // Field-level errors
  normalizedData?: Record<string, any>;       // Cleaned submission data
}

interface ChipContext {
  vendor?: Record<string, any>;       // Vendor data (name, email, phone)
  campaign?: Record<string, any>;     // Campaign data (name, status, address)
  listing?: Record<string, any>;      // Cooper API listing data
}
```

---

## Core Functions

### `compileTemplate(markdown: string): CompiledForm`

Parses and compiles a markdown template. Use when creating/updating forms.

**Purpose:** Convert raw markdown into production-ready compiled form.

**Usage:**
```typescript
import { compileTemplate } from "./template-processor";

const compiled = compileTemplate(templateMarkdown);

if (!compiled.isValid) {
  console.error("Template errors:", compiled.errors);
  return;
}

// Save to database
await db.insert(forms).values({
  template: compiled.templateMarkdown,
  ast: compiled.ast,
  htmlPreview: compiled.htmlPreview,
  // ... other fields
});
```

**Return Value:**
```typescript
{
  templateMarkdown: "# Form\n...",
  ast: { title: "Form", pages: [...], ... },
  htmlPreview: "<form>...</form>",
  validator: ZodSchema,
  chipReferences: ["vendor.name", "listing.price"],
  errors: [],
  isValid: true
}
```

**Errors Returned (if invalid):**
```typescript
if (!compiled.isValid) {
  compiled.errors.forEach(err => {
    console.error(`Line ${err.line}: ${err.message}`);
  });
  // Example: Line 0: "Form must have a title (# Title)"
}
```

---

### `renderFormWithData(compiled: CompiledForm, context: ChipContext): RenderedForm`

Renders a compiled form with chip data injected.

**Purpose:** Prepare form for display with pre-filled values from API data.

**Usage:**
```typescript
import { renderFormWithData } from "./template-processor";

const rendered = renderFormWithData(compiled, {
  vendor: { name: "Smith Family", email: "smith@example.com" },
  campaign: { name: "Spring 2024 Campaign" },
  listing: {
    displayAddress: "123 Main St, City",
    salePrice: 850000,
    bedrooms: 3
  }
});

console.log(rendered.html);      // Rendered form HTML
console.log(rendered.pageCount); // 1, 2, 3, etc.
```

**Return Value:**
```typescript
{
  html: "<form>...</form>",
  pageCount: 2,
  hiddenFields: {} // Reserved for future use
}
```

**Data Injection:**
- Looks up chip references in context
- Adds data attributes to fields
- Does NOT automatically fill form inputs (client handles that)

**Example:**
```markdown
### Vendor Name
- field: vendorName
- chip: vendor.name
```

With context `{ vendor: { name: "Smith" } }`, the field will have access to "Smith" via data attribute.

---

### `validateSubmission(compiled: CompiledForm, submissionData: Record<string, any>): SubmissionValidationResult`

Validates form submission against the compiled template schema.

**Purpose:** Ensure submission data matches form requirements.

**Usage:**
```typescript
import { validateSubmission } from "./template-processor";

const submission = {
  fullName: "John Smith",
  email: "john@example.com",
  budget: 500000
};

const result = validateSubmission(compiled, submission);

if (!result.isValid) {
  console.error("Validation errors:");
  Object.entries(result.errors).forEach(([field, msgs]) => {
    console.error(`  ${field}: ${msgs.join(", ")}`);
  });

  // Example output:
  // fullName: Required
  // email: Invalid email format
  // budget: Must be between 100000 and 5000000

  return res.status(400).json({ errors: result.errors });
}

// Use normalized data for storage
await createSubmission({
  data: result.normalizedData,  // Cleaned, validated data
  templateVersion: form.version
});
```

**Validation Rules Applied:**
- ✓ Required fields present
- ✓ Text field length constraints (minLength, maxLength)
- ✓ Email format validation
- ✓ Number ranges (min, max)
- ✓ Enum validation for select/radio fields
- ✓ Currency field format

**Return Value (Success):**
```typescript
{
  isValid: true,
  errors: {},
  normalizedData: {
    fullName: "John Smith",
    email: "john@example.com",
    budget: 500000
  }
}
```

**Return Value (Failure):**
```typescript
{
  isValid: false,
  errors: {
    "fullName": ["fullName is required"],
    "email": ["Invalid email format"],
    "budget": ["Must be a number"]
  },
  normalizedData: undefined
}
```

---

### `getOrCompileTemplate(formId: string, markdown: string): CompiledForm`

Gets cached compiled template or compiles if not in cache.

**Purpose:** Avoid recompiling same template multiple times.

**Cache Details:**
- **TTL:** 1 hour (3,600,000 ms)
- **Storage:** In-memory Map
- **Key:** Form ID

**Usage:**
```typescript
import { getOrCompileTemplate } from "./template-processor";

// First call: parses template
const compiled1 = getOrCompileTemplate("form-123", markdown);

// Second call (within 1 hour): returns cached version
const compiled2 = getOrCompileTemplate("form-123", markdown);

// Same object reference if not expired
console.log(compiled1 === compiled2); // true (if within 1 hour)
```

**When Cache Expires:**
- After 1 hour of creation
- When `invalidateTemplateCache(formId)` is called
- When `clearTemplateCache()` is called

---

### `invalidateTemplateCache(formId: string): void`

Clear cache for a specific form.

**Purpose:** Force recompilation after template update.

**Usage:**
```typescript
import { invalidateTemplateCache } from "./template-processor";

// Update template in database
await updateForm(formId, newTemplate);

// Clear cache so next request recompiles
invalidateTemplateCache(formId);
```

**When to Call:**
- After updating form template
- After database schema migration
- If you detect template is corrupted

---

### `clearTemplateCache(): void`

Clear entire template cache.

**Purpose:** Emergency cache clear or system maintenance.

**Usage:**
```typescript
import { clearTemplateCache } from "./template-processor";

// Clear all cached templates
clearTemplateCache();
```

**When to Call:**
- Server startup (if caching across restarts)
- System memory pressure
- Debugging cache issues

---

### `getRequiredChips(compiled: CompiledForm): string[]`

Get list of all chip references used in a form.

**Purpose:** Determine what external data is needed.

**Usage:**
```typescript
import { getRequiredChips } from "./template-processor";

const chips = getRequiredChips(compiled);
console.log(chips);
// Output: ["vendor.name", "listing.salePrice", "campaign.status"]
```

**Use Cases:**
- Validate that all required data sources are available
- Debug missing prefill data
- Document form dependencies

---

### `hasAllRequiredChips(compiled: CompiledForm, context: ChipContext): { satisfied: boolean; missing: string[] }`

Check if all required chips are available in context.

**Purpose:** Validate form can be rendered before attempting.

**Usage:**
```typescript
import { hasAllRequiredChips } from "./template-processor";

const check = hasAllRequiredChips(compiled, context);

if (!check.satisfied) {
  console.warn("Missing chip data:", check.missing);
  // Could render form without data or fetch missing fields
}
```

**Return Value (All Available):**
```typescript
{
  satisfied: true,
  missing: []
}
```

**Return Value (Some Missing):**
```typescript
{
  satisfied: false,
  missing: ["listing.bedrooms", "listing.bathrooms"]
}
```

---

### `normalizeSubmission(data: Record<string, any>, templateVersion: number): Record<string, any>`

Add metadata to submission data.

**Purpose:** Include template version and submission timestamp.

**Usage:**
```typescript
import { normalizeSubmission } from "./template-processor";

const normalized = normalizeSubmission(formData, form.version);

// Returns:
// {
//   fullName: "John",
//   email: "john@example.com",
//   _templateVersion: 2,
//   _submittedAt: "2024-10-22T10:30:00.000Z"
// }
```

**Included Metadata:**
- `_templateVersion`: Which form version was used
- `_submittedAt`: ISO timestamp of submission

---

## Cache Management

### Cache Statistics

```typescript
import { getTemplateCacheStats } from "./template-processor";

const stats = getTemplateCacheStats();
console.log(stats);

// Output:
// {
//   size: 5,
//   items: [
//     { formId: "form-123", age: 45000, valid: true },
//     { formId: "form-456", age: 120000, valid: true },
//     { formId: "form-789", age: 3599000, valid: false }
//   ]
// }
```

### Cache Configuration

**Current Settings:**
- **TTL:** `3600000` ms (1 hour)
- **Storage:** In-memory `Map`
- **Policy:** LRU (Least Recently Used)

**To Change TTL:**

Edit `server/template-processor.ts`:
```typescript
export const TEMPLATE_CACHE_TTL = 7200000; // 2 hours
```

---

## Integration Points

### With Database

**Storage Pattern:**
```typescript
// Create form
const compiled = compileTemplate(markdown);
await storage.createForm({
  template: compiled.templateMarkdown,
  ast: compiled.ast,
  htmlPreview: compiled.htmlPreview,
  // ... other fields
});

// Retrieve form
const form = await storage.getForm(formId);
const compiled = getOrCompileTemplate(formId, form.template);
```

**Why Store Both?**
- `template`: Human-readable markdown
- `ast`: Fast to render without parsing
- `htmlPreview`: Quick static preview without data

---

### With API Routes

**Create Form Endpoint:**
```typescript
app.post("/api/forms", async (req, res) => {
  const { template, title, description } = req.body;

  const compiled = compileTemplate(template);

  if (!compiled.isValid) {
    return res.status(400).json({
      error: "Invalid template",
      details: compiled.errors
    });
  }

  const form = await storage.createForm({
    title,
    description,
    template: compiled.templateMarkdown,
    ast: compiled.ast,
    htmlPreview: compiled.htmlPreview
  });

  res.status(201).json(form);
});
```

**Submit Form Endpoint:**
```typescript
app.post("/api/submissions", async (req, res) => {
  const { formId, data } = req.body;

  const form = await storage.getForm(formId);
  const compiled = getOrCompileTemplate(formId, form.template);

  const validation = validateSubmission(compiled, data);

  if (!validation.isValid) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.errors
    });
  }

  const submission = await storage.createSubmission({
    formId,
    data: validation.normalizedData,
    templateVersion: form.version
  });

  res.json(submission);
});
```

**Render Form Endpoint:**
```typescript
app.get("/api/forms/:id/render", async (req, res) => {
  const form = await storage.getForm(req.params.id);
  const campaign = await storage.getCampaign(req.query.campaignId);
  const vendor = await storage.getVendor(req.query.vendorId);

  const compiled = getOrCompileTemplate(form.id, form.template);

  const rendered = renderFormWithData(compiled, {
    vendor,
    campaign,
    listing: campaign.listingData
  });

  res.json({
    html: rendered.html,
    pageCount: rendered.pageCount,
    ast: compiled.ast
  });
});
```

---

## Error Handling

### Template Compilation Errors

```typescript
const compiled = compileTemplate(badTemplate);

if (!compiled.isValid) {
  // compiled.errors contains details
  compiled.errors.forEach(error => {
    console.error(`Line ${error.line}: ${error.message}`);
  });
}
```

### Submission Validation Errors

```typescript
const result = validateSubmission(compiled, formData);

if (!result.isValid) {
  // result.errors organized by field
  const fieldErrors = result.errors;

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    console.error(`${field}:`, messages);
  });
}
```

### Common Issues

| Issue | Error | Fix |
|-------|-------|-----|
| Form won't compile | "Form must have a title" | Ensure template starts with `# Title` |
| Submission fails | "Validation failed" | Check field types and required flags |
| Chip data missing | Rendered without data | Verify context has correct structure |
| Cache not clearing | Old version served | Call `invalidateTemplateCache(id)` |

---

## Performance Optimization

### Caching Strategy

**Request Pattern 1: Single request**
```typescript
const compiled = compileTemplate(markdown);    // 1-2ms
const html = renderTemplate(compiled.ast);     // <1ms
```

**Request Pattern 2: Multiple requests (cached)**
```typescript
// First request: parse + cache
const compiled1 = getOrCompileTemplate(formId, markdown);  // ~2ms

// Subsequent requests: from cache
const compiled2 = getOrCompileTemplate(formId, markdown);  // <0.1ms
```

### Database Query Optimization

**Load form with rendering:**
```typescript
const form = await storage.getForm(formId);

// Option 1: Use cached compilation + stored preview
// Fastest: just return form.htmlPreview

// Option 2: Re-render with fresh data
const compiled = getOrCompileTemplate(formId, form.template);
const rendered = renderFormWithData(compiled, context);
```

### Memory Considerations

- **Small form:** ~10KB compiled
- **Large form (100 fields):** ~50KB compiled
- **Cache limit:** None (set your own if needed)

**Memory Monitoring:**
```typescript
const stats = getTemplateCacheStats();
console.log(`Cache size: ${stats.size} forms`);

// Monitor total memory:
const totalSize = stats.items.length * 30000; // Rough estimate
console.log(`Estimated cache memory: ${totalSize / 1024 / 1024}MB`);
```

---

## Testing

### Unit Test Example

```typescript
import { compileTemplate, validateSubmission } from "./template-processor";

describe("Template Processor", () => {
  it("should compile valid template", () => {
    const template = `# Test Form
### Name
- field: name
- required: true`;

    const compiled = compileTemplate(template);
    expect(compiled.isValid).toBe(true);
    expect(compiled.ast.title).toBe("Test Form");
  });

  it("should validate submission", () => {
    const compiled = compileTemplate(template);
    const data = { name: "John" };

    const result = validateSubmission(compiled, data);
    expect(result.isValid).toBe(true);
  });

  it("should reject invalid submission", () => {
    const compiled = compileTemplate(template);
    const data = { name: "" }; // Empty, required field

    const result = validateSubmission(compiled, data);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });
});
```

---

## Debugging Tips

### Enable Verbose Logging

Add to your code:
```typescript
const compiled = compileTemplate(markdown);
console.log("Compiled AST:", JSON.stringify(compiled.ast, null, 2));
console.log("Chips:", compiled.chipReferences);
console.log("Valid:", compiled.isValid);
```

### Validate Chip Resolution

```typescript
const chips = getRequiredChips(compiled);
const check = hasAllRequiredChips(compiled, context);

if (!check.satisfied) {
  console.warn("Missing:", check.missing);
  console.warn("Provided:", Object.keys(context).flat());
}
```

### Check Cache Status

```typescript
const stats = getTemplateCacheStats();
console.table(stats.items);
```

---

## See Also

- **Template Parser:** `shared/template-parser.ts` - Low-level parsing/rendering
- **Form Components:** React components for UI
- **Routes:** `server/routes.ts` - API endpoint usage
- **Full Guide:** `TEMPLATE_SYSTEM.md` - Complete system overview
