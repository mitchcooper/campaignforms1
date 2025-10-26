# Template Parser Module (`shared/template-parser.ts`)

## Overview

The template parser is a shared TypeScript module that converts markdown-style form templates into an Abstract Syntax Tree (AST) that can be rendered, validated, and executed. It's used by both the client (for preview) and server (for compilation and validation).

**Key Statistics:**
- ~850 lines of code
- Zero external dependencies (uses only built-in TypeScript/Zod)
- ~1KB minified + gzipped

## Architecture

### Core Components

```
TemplateParser
  └─ Converts markdown string → FormAST

TemplateValidator
  └─ Validates FormAST for completeness/correctness

TemplateRenderer
  └─ Converts FormAST → HTML (without data)

DataInjector
  └─ Replaces chip references with actual data in FormAST

Submission Schema Generator
  └─ Generates Zod schema for validating form submissions
```

## Type System

### FormAST Structure

```typescript
interface FormAST {
  title: string;                          // Form title (from # heading)
  description?: string;                   // Form description
  pages: Page[];                          // Array of pages (for multi-page forms)
  metadata: {
    version: number;                      // Schema version
    createdAt?: Date;                     // When parsed
    chipReferences: string[];             // All chips used (e.g., ["vendor.name"])
    estimatedReadTime?: number;           // Minutes to complete
  };
}

interface Page {
  id: string;                             // Unique page ID
  sections: Section[];                    // Sections on this page
}

interface Section {
  id: string;                             // Unique section ID
  title?: string;                         // Section heading (from ## heading)
  description?: string;                   // Section description text
  fields: FieldContainer[];               // Fields, dividers, conditionals
}

type FieldContainer = Field | ConditionalBlock | Divider;

// Basic Field Type
interface BaseField {
  id: string;                             // HTML name, auto-generated from label
  label: string;                          // Display label
  type: FieldType;                        // text, email, number, currency, etc.
  required: boolean;                      // Is field mandatory?
  placeholder?: string;                   // Placeholder text
  chip?: string;                          // e.g., "vendor.name" for auto-fill
  description?: string;                   // Help text above field
  helpText?: string;                      // Small text below field
}

// Text-based Fields
interface TextField extends BaseField {
  type: "text" | "textarea" | "email" | "number" | "currency" | "date" | "time";
  minLength?: number;                     // For text fields
  maxLength?: number;                     // For text fields
  min?: number;                           // For number/currency fields
  max?: number;                           // For number/currency fields
  step?: number;                          // For number/currency fields
  pattern?: string;                       // Regex pattern for validation
}

// Selection Fields
interface SelectField extends BaseField {
  type: "select" | "radio" | "checkbox";
  options: FieldOption[];                 // Available choices
  multiple?: boolean;                     // For checkboxes
}

// Signature Fields
interface SignatureField extends BaseField {
  type: "signature";
  signatory?: string;                     // Optional: pre-assign to specific signatory
  required: true;                         // Signatures are always required
}

// Field Union Type
type Field = TextField | SelectField | SignatureField;

interface FieldOption {
  label: string;                          // Display text
  value: string;                          // Form submission value
}

// Conditional Logic
interface ConditionalBlock {
  type: "conditional";
  condition: Condition;                   // When to show these fields
  children: FieldContainer[];             // Fields to show conditionally
}

interface Condition {
  field: string;                          // Field to check
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "contains";
  value: any;                             // Value to compare against
}

// Divider/Separator
interface Divider {
  type: "divider";                        // Renders as <hr>
}
```

## Public API

### Main Functions

#### `parseTemplate(markdown: string): { ast: FormAST; errors: ValidationError[] }`

Parses markdown template string into AST with validation.

```typescript
import { parseTemplate } from "@shared/template-parser";

const template = `# Contact Form
### Name
- field: name
- required: true`;

const { ast, errors } = parseTemplate(template);

if (errors.length > 0) {
  console.error("Errors:", errors);
  // errors = [{ line: 0, message: "..." }]
}

// Use ast for rendering, saving, validation
```

**Returns:**
- `ast`: Fully parsed FormAST ready for use
- `errors`: Array of validation errors (empty if valid)

---

#### `renderTemplate(ast: FormAST): string`

Converts AST to HTML form (without data injection).

```typescript
import { renderTemplate } from "@shared/template-parser";

const html = renderTemplate(ast);
console.log(html);
// Output: <form class="form-template"><h1>...</h1>...</form>
```

**Returns:** HTML string with form structure and fields.

**Output Structure:**
```html
<form class="form-template" data-title="Form Title">
  <h1 class="form-title">Form Title</h1>
  <p class="form-description">Description</p>

  <div class="form-page" data-page="0">
    <div class="form-section" data-section="section-1">
      <h2 class="section-title">Section Name</h2>

      <div class="form-field" data-field="fieldName" data-type="text">
        <label for="fieldName" class="field-label">
          Field Label
          <span class="required-indicator">*</span>
        </label>
        <input type="text" id="fieldName" name="fieldName" class="field-input" />
      </div>
    </div>
  </div>
</form>
```

**Note:** This is structural HTML. Style it with CSS or use React components for better UX.

---

#### `renderWithData(ast: FormAST, context: ChipContext): string`

Renders template with chip data injected (for display purposes).

```typescript
import { renderWithData } from "@shared/template-parser";

const html = renderWithData(ast, {
  vendor: { name: "John Smith", email: "john@example.com" },
  campaign: { name: "Spring 2024" },
  listing: { salePrice: 500000 }
});
```

**Note:** This injects data into the AST but doesn't automatically fill form fields. Use `initialData` prop in React component for actual form pre-filling.

---

#### `getSubmissionSchema(ast: FormAST): ZodSchema`

Generates a Zod schema for validating form submissions.

```typescript
import { getSubmissionSchema } from "@shared/template-parser";

const schema = getSubmissionSchema(ast);

// Validate form submission
const result = schema.safeParse(submissionData);

if (result.success) {
  console.log("Valid data:", result.data);
} else {
  console.error("Validation errors:", result.error.issues);
  // issues = [{ path: ["name"], message: "Required" }]
}
```

**Generated Schema Rules:**
- Required fields: `.required()`
- Text fields: Min/max length validation
- Email fields: Email format validation
- Number fields: Min/max range validation
- Select fields: Enum validation
- Checkbox fields: Array of valid options

---

### Class: `TemplateParser`

The core parsing engine.

```typescript
import { TemplateParser } from "@shared/template-parser";

const parser = new TemplateParser(markdownString);
const ast = parser.parse();
```

**Methods:**
- `parse()`: Main entry point, returns FormAST

**Internal Methods (for advanced use):**
- `parsePage()`: Parses a page and its sections
- `parseSection()`: Parses a section and its fields
- `parseField()`: Parses a single field and its properties
- `parseProperty()`: Parses a field property line
- `parseConditional()`: Parses conditional block
- `parseCondition()`: Parses condition string (e.g., "status == Active")

---

### Class: `TemplateValidator`

Validates AST correctness.

```typescript
import { TemplateValidator } from "@shared/template-parser";

const validator = new TemplateValidator();
const errors = validator.validate(ast);

if (errors.length > 0) {
  errors.forEach(e => {
    console.error(`Line ${e.line}: ${e.message}`);
  });
}
```

**Validation Checks:**
- ✓ Form has a title
- ✓ Form has at least one section
- ✓ Each field has label and ID
- ✓ Select/radio/checkbox have options
- ✓ Conditional references valid fields

---

### Class: `TemplateRenderer`

Converts AST to HTML.

```typescript
import { TemplateRenderer } from "@shared/template-parser";

const renderer = new TemplateRenderer();
const html = renderer.renderHTML(ast);
```

**Methods:**
- `renderHTML(ast)`: Generate full HTML form
- `renderSection(section)`: Render a section
- `renderField(field)`: Render a single field
- `renderInput(field)`: Generate input element

**Field Type → HTML Mapping:**
| Type | HTML |
|------|------|
| text | `<input type="text">` |
| email | `<input type="email">` |
| number | `<input type="number">` |
| currency | `<input type="number">` with currency display |
| date | `<input type="date">` |
| time | `<input type="time">` |
| textarea | `<textarea>` |
| select | `<select>` with options |
| radio | Radio button group |
| checkbox | Checkbox group |

---

### Class: `DataInjector`

Injects data from sources into AST.

```typescript
import { DataInjector } from "@shared/template-parser";

const injector = new DataInjector();
const injected = injector.injectData(ast, {
  vendor: { name: "Smith", email: "smith@example.com" },
  campaign: { name: "Spring 2024" },
  listing: { salePrice: 500000 }
});
```

**What It Does:**
- Scans AST for chip references
- Looks up values from context
- Injects into field data attributes
- Returns modified AST

**Note:** Chip resolution is read-only. Form rendering handles actual pre-filling via React state.

---

### Field Type Validation

```typescript
type FieldType =
  | "text"         // Single line text input
  | "textarea"     // Multi-line text
  | "email"        // Email input with validation
  | "number"       // Integer input
  | "currency"     // Number with currency formatting (step=0.01)
  | "date"         // Date picker
  | "time"         // Time picker
  | "select"       // Dropdown menu
  | "checkbox"     // Multiple choice checkboxes
  | "radio"        // Single choice radio buttons
  | "signature";   // Digital signature field (canvas + typed)
```

---

## Parsing Rules

### Markdown Structure

```markdown
# Title                          # Required, first line
Description text                 # Optional, before first ##

## Section Name                  # Required, at least one
Section description              # Optional

### Field Name                   # Field heading
- label: "Display"              # Properties start with dash
- field: fieldId                # Optional if label exists
- type: select                  # Optional (default: text)
- required: true                # Optional (default: false)
- options: A, B, C              # For select/radio/checkbox
- chip: vendor.name             # Optional auto-fill reference

---                              # Divider

- if: fieldId == "value"        # Conditional block
  - label: "Conditional Field"  # Indented children (2 spaces)
  - field: conditionalFieldId

---page-break---                # Page break for pagination
```

### Property Parsing

Each property is a line starting with `- `:

```
- label: "Field Label"           # String values
- field: fieldName              # Identifier
- required: true                # Boolean (true/false/yes/no/1/0)
- minLength: 5                  # Numbers
- options: A, B, C              # Comma-separated list
- chip: vendor.name             # Dot-notation reference
```

### ID Generation

Field IDs are auto-generated from labels if not provided:

```
### My Field Name
  → field id: "my-field-name"

### Email Address
  → field id: "email-address"

- field: customId
  → uses "customId" instead
```

---

## Error Handling

### Validation Errors

```typescript
interface ValidationError {
  line: number;           // Line in markdown (0-indexed)
  message: string;        // Describe the problem
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Form must have a title" | No `# Title` | Add `# Form Title` at top |
| "Field must have label" | Missing label property | Add `- label: "..."`  |
| "must have options" | Select field without options | Add `- options: A, B, C` |
| "Invalid operator" | Bad conditional operator | Use ==, !=, >, <, >=, <=, in, contains |

### Error Recovery

The parser is lenient:
- ✓ Extra whitespace is ignored
- ✓ Unknown properties are skipped
- ✓ Missing optional properties use defaults
- ✗ Will error on structural issues (missing label, title, etc.)

---

## Examples

### Simple Contact Form

```typescript
const template = `# Contact Form
Please fill out this form

## Your Information

### Full Name
- field: fullName
- required: true
- placeholder: "John Smith"

### Email
- field: email
- type: email
- required: true

### Message
- field: message
- type: textarea
- required: false
`;

const { ast, errors } = parseTemplate(template);
const html = renderTemplate(ast);
const schema = getSubmissionSchema(ast);
```

### Form with Conditionals

```typescript
const template = `# Support Ticket
### Issue Type
- field: issueType
- type: select
- required: true
- options: Bug, Feature Request, Other

- if: issueType == "Bug"
  - label: "Affected Version"
  - field: affectedVersion
  - required: true

- if: issueType == "Feature Request"
  - label: "Priority"
  - field: priority
  - type: radio
  - options: Low, Medium, High
`;
```

### Multi-page Property Inquiry

```typescript
const template = `# Property Inquiry

## Page 1: Your Details

### Name
- field: name
- chip: vendor.name

### Phone
- field: phone
- chip: vendor.phone

---page-break---

## Page 2: Property Interest

### Property Address
- field: address
- chip: listing.displayAddress

### Your Budget
- field: budget
- type: currency
- chip: listing.salePrice
`;
```

---

## Performance Notes

### Parsing Performance

- Single template parse: < 1ms
- Validation: < 0.5ms
- HTML rendering: < 1ms
- Data injection: < 0.5ms

**Optimization:** Cache parsed AST and compiled schemas in `template-processor.ts`

### Memory Usage

- Simple form AST: ~2-5KB
- Complex form (20+ fields): ~10-20KB

### Best Practices

1. **Parse once, render many times:** Store AST in database
2. **Reuse validators:** Don't recompile Zod schemas
3. **Cache HTML:** Store rendered HTML for static previews
4. **Inject data selectively:** Only inject needed chips

---

## Extension Points

### Adding Custom Field Types

To support new field types:

1. **Add to union type:**
```typescript
type FieldType = "text" | ... | "customType";
```

2. **Update renderer:**
```typescript
private renderInput(field: Field): string {
  if (field.type === "customType") {
    return `<custom-input ...></custom-input>`;
  }
}
```

3. **Update schema generator:**
```typescript
case "customType":
  schema = z.custom(val => isValid(val));
  break;
```

### Custom Validators

Extend `TemplateValidator` class:

```typescript
class StrictValidator extends TemplateValidator {
  validate(ast: FormAST): ValidationError[] {
    const errors = super.validate(ast);

    // Add custom checks
    if (ast.pages.length > 5) {
      errors.push({
        line: 0,
        message: "Form cannot have more than 5 pages"
      });
    }

    return errors;
  }
}
```

---

## Troubleshooting

### Chips Not Working

**Problem:** Chip references show in AST but don't inject data

**Solution:** Use `renderWithData()` instead of `renderTemplate()`

```typescript
// Wrong:
const html = renderTemplate(ast);

// Right:
const html = renderWithData(ast, {
  vendor: { name: "Smith" }
});
```

### Conditionals Not Showing

**Problem:** Conditional fields never appear in rendered form

**Diagnosis:**
1. Check condition syntax: `if: fieldName == "value"`
2. Verify field exists before condition
3. Check value types match (strings should be quoted if needed)

### Missing Fields in Schema

**Problem:** Field validation fails but field has no value requirement

**Solution:** Ensure field has `required: true` property

```typescript
### Field Name
- label: "Name"
- field: name
- required: true  # Add this line
```

---

## See Also

- **Template Processor:** `server/template-processor.ts` - Server-side compilation and caching
- **Form Components:** React components that use this parser
- **Full Guide:** `TEMPLATE_SYSTEM.md` - Complete template system documentation
