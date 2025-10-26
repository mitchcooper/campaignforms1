/**
 * Form Template Parser
 *
 * Parses markdown-inspired form templates into an AST that can be rendered,
 * validated, and used to process form submissions.
 */

import { z } from "zod";

// ============================================================================
// Type Definitions
// ============================================================================

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "currency"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "checkbox"
  | "radio"
  | "signature";

export interface FieldOption {
  label: string;
  value: string;
}

export interface Condition {
  field: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "contains";
  value: any;
}

export interface BaseField {
  id: string; // field name, auto-generated from label if not provided
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  chip?: string; // Data source reference: vendor.name, campaign.status, listing.price
  description?: string;
  helpText?: string;
}

export interface SelectField extends BaseField {
  type: "select" | "radio" | "checkbox";
  options: FieldOption[];
  multiple?: boolean;
}

export interface TextField extends BaseField {
  type: "text" | "textarea" | "email" | "number" | "currency" | "date" | "time" | "datetime";
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
}

export interface SignatureField extends BaseField {
  type: "signature";
  signatory?: string; // Optional pre-assignment to specific signatory
  required: true; // Signatures are always required
  captureTimestamp?: boolean; // Automatically capture timestamp when signed
  timestampFormat?: string; // Format for embedded timestamp (e.g., "d MMM yyyy, h:mm a zzz")
  embedTimestamp?: boolean; // Display timestamp within the signature field itself
}

export type Field = TextField | SelectField | SignatureField;

export interface Section {
  id: string;
  title?: string;
  description?: string;
  fields: FieldContainer[];
}

export type FieldContainer = Field | ConditionalBlock | Divider;

export interface ConditionalBlock {
  type: "conditional";
  condition: Condition;
  children: FieldContainer[];
}

export interface Divider {
  type: "divider";
}

export interface Page {
  id: string;
  sections: Section[];
}

export interface FormAST {
  title: string;
  description?: string;
  pages: Page[];
  metadata: {
    version: number;
    createdAt?: Date;
    chipReferences: string[]; // List of all chip references found
    estimatedReadTime?: number;
    formConfig?: {
      autoSubmitOnSignature?: boolean;
      submitTrigger?: string;
    };
  };
}

export interface ValidationError {
  line: number;
  message: string;
}

export interface ChipContext {
  vendor?: Record<string, any>;
  campaign?: Record<string, any>;
  listing?: Record<string, any>;
}

// ============================================================================
// Parser Implementation
// ============================================================================

export class TemplateParser {
  private text: string;
  private lines: string[];
  private currentLine: number = 0;
  private chipReferences: Set<string> = new Set();

  constructor(text: string) {
    this.text = text;
    this.lines = text.split("\n");
  }

  /**
   * Main parse method - converts markdown template to AST
   */
  parse(): FormAST {
    this.currentLine = 0;
    this.chipReferences.clear();

    const ast: FormAST = {
      title: "",
      pages: [],
      metadata: {
        version: 1,
        chipReferences: [],
      },
    };

    // Parse form configuration if present (YAML frontmatter)
    this.skipWhitespace();
    if (this.peek() === "---") {
      this.consume(); // Skip opening ---
      const configLines: string[] = [];
      while (this.peek() && this.peek() !== "---") {
        configLines.push(this.consume());
      }
      if (this.peek() === "---") {
        this.consume(); // Skip closing ---
        ast.metadata.formConfig = this.parseFormConfig(configLines);
      }
    }

    // Parse title (first # heading)
    this.skipWhitespace();
    if (this.peek()?.startsWith("# ")) {
      ast.title = this.consume().slice(2).trim();
    }

    // Parse description (if present before first ##)
    this.skipWhitespace();
    const descLines: string[] = [];
    while (this.peek() && !this.peek()?.startsWith("##") && !this.peek()?.startsWith("---")) {
      const line = this.consume();
      if (line.trim()) descLines.push(line);
    }
    if (descLines.length > 0) {
      ast.description = descLines.join("\n").trim();
    }

    // Parse pages and sections
    ast.pages.push(this.parsePage());

    ast.metadata.chipReferences = Array.from(this.chipReferences);
    return ast;
  }

  /**
   * Parse a page (or pages separated by page breaks)
   */
  private parsePage(): Page {
    const page: Page = {
      id: `page-${Date.now()}`,
      sections: [],
    };

    while (this.currentLine < this.lines.length) {
      // Check for page break
      if (this.peek()?.trim() === "---page-break---") {
        this.consume();
        break;
      }

      // Check for section
      if (this.peek()?.startsWith("## ")) {
        page.sections.push(this.parseSection());
      } else {
        this.currentLine++;
      }
    }

    // Ensure at least one section
    if (page.sections.length === 0) {
      page.sections.push({
        id: `section-default`,
        fields: [],
      });
    }

    return page;
  }

  /**
   * Parse a section (## heading and its fields)
   */
  private parseSection(): Section {
    const titleLine = this.consume();
    const title = titleLine.slice(2).trim();

    const section: Section = {
      id: `section-${this.sanitizeId(title)}`,
      title: title || undefined,
      fields: [],
    };

    // Skip only one blank line after section title (if present)
    if (this.peek() && !this.peek()?.trim()) {
      this.consume();
    }

    // Parse section description (non-field lines until first ### or ##)
    const descLines: string[] = [];
    while (
      this.peek() !== undefined &&
      !this.peek()?.startsWith("### ") &&
      !this.peek()?.startsWith("## ") &&
      !this.peek()?.startsWith("---")
    ) {
      const line = this.peek();
      // Stop if we hit a field property line
      if (line?.startsWith("-")) {
        break;
      }
      // Consume the line (including empty lines for multi-paragraph support)
      descLines.push(this.consume());
    }
    if (descLines.length > 0) {
      section.description = descLines.join("\n").trim();
    }

    this.skipWhitespace();

    // Parse fields and conditionals
    while (this.currentLine < this.lines.length) {
      const nextLine = this.peek();

      // End section on ##, page break, or new section
      if (nextLine?.startsWith("## ") || nextLine?.startsWith("---page-break---")) {
        break;
      }

      // Divider
      if (nextLine?.trim() === "---") {
        this.consume();
        section.fields.push({ type: "divider" });
        this.skipWhitespace();
        continue;
      }

      // Conditional block
      if (nextLine?.startsWith("- if: ")) {
        section.fields.push(this.parseConditional());
        continue;
      }

      // Field
      if (nextLine?.startsWith("### ")) {
        section.fields.push(this.parseField());
        continue;
      }

      // Skip unknown lines
      if (nextLine && !nextLine.startsWith("  ")) {
        this.currentLine++;
      } else {
        break;
      }
    }

    return section;
  }

  /**
   * Parse a field (### heading and its properties)
   */
  private parseField(): Field {
    const fieldTitleLine = this.consume();
    const fieldLabel = fieldTitleLine.slice(3).trim();
    const fieldId = this.sanitizeId(fieldLabel);

    const field: any = {
      id: fieldId,
      label: fieldLabel,
      type: "text",
      required: false,
    };

    this.skipWhitespace();

    // Parse field properties
    while (this.currentLine < this.lines.length) {
      const line = this.peek();

      // End field on next ### or ##
      if (line?.startsWith("### ") || line?.startsWith("## ") || line?.startsWith("---")) {
        break;
      }

      // Non-property line
      if (!line?.startsWith("- ")) {
        if (line && line.trim() === "") {
          this.currentLine++;
          continue;
        }
        break;
      }

      const propLine = this.consume().slice(2).trim(); // Remove "- "
      this.parseProperty(field, propLine);
    }

    this.skipWhitespace();
    return field;
  }

  /**
   * Parse form configuration from YAML frontmatter
   */
  private parseFormConfig(configLines: string[]): any {
    const config: any = {};
    let inFormConfig = false;
    
    for (const line of configLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      if (key === 'formConfig') {
        inFormConfig = true;
        continue;
      }
      
      if (inFormConfig && key === 'autoSubmitOnSignature') {
        config.autoSubmitOnSignature = this.parseBoolean(value);
      } else if (inFormConfig && key === 'submitTrigger') {
        config.submitTrigger = this.parseString(value);
      }
    }
    
    return Object.keys(config).length > 0 ? config : undefined;
  }

  /**
   * Parse a field property (e.g., "label: First Name")
   */
  private parseProperty(field: any, propLine: string): void {
    const colonIndex = propLine.indexOf(":");
    if (colonIndex === -1) return;

    const key = propLine.slice(0, colonIndex).trim();
    const value = propLine.slice(colonIndex + 1).trim();

    switch (key) {
      case "label":
        field.label = this.parseString(value);
        break;
      case "field":
        field.id = this.parseString(value);
        break;
      case "type":
        field.type = this.parseString(value);
        break;
      case "required":
        field.required = this.parseBoolean(value);
        break;
      case "placeholder":
        field.placeholder = this.parseString(value);
        break;
      case "chip":
        field.chip = this.parseString(value);
        this.chipReferences.add(field.chip);
        break;
      case "description":
        field.description = this.parseString(value);
        break;
      case "helpText":
        field.helpText = this.parseString(value);
        break;
      case "options":
        field.options = this.parseOptions(value);
        break;
      case "minLength":
        field.minLength = this.parseNumber(value);
        break;
      case "maxLength":
        field.maxLength = this.parseNumber(value);
        break;
      case "min":
        field.min = this.parseNumber(value);
        break;
      case "max":
        field.max = this.parseNumber(value);
        break;
      case "step":
        field.step = this.parseNumber(value);
        break;
      case "pattern":
        field.pattern = this.parseString(value);
        break;
      case "multiple":
        field.multiple = this.parseBoolean(value);
        break;
      case "signatory":
        field.signatory = this.parseString(value);
        break;
      case "captureTimestamp":
        field.captureTimestamp = this.parseBoolean(value);
        break;
      case "timestampFormat":
        field.timestampFormat = this.parseString(value);
        break;
      case "embedTimestamp":
        field.embedTimestamp = this.parseBoolean(value);
        break;
    }
  }

  /**
   * Parse conditional block (- if: condition)
   */
  private parseConditional(): ConditionalBlock {
    const condLine = this.consume().slice(5).trim(); // Remove "- if: "
    const condition = this.parseCondition(condLine);

    const block: ConditionalBlock = {
      type: "conditional",
      condition,
      children: [],
    };

    this.skipWhitespace();

    // Parse children (indented fields)
    while (this.currentLine < this.lines.length) {
      const line = this.peek();

      // End block on unindented line
      if (line && !line.startsWith("  ") && line.trim() !== "") {
        break;
      }

      if (!line || line.trim() === "") {
        this.currentLine++;
        continue;
      }

      // Parse indented field
      if (line.startsWith("  ### ")) {
        const trimmed = line.slice(2);
        const fieldTitleLine = this.consume().slice(2);
        const fieldLabel = fieldTitleLine.slice(3).trim();
        const fieldId = this.sanitizeId(fieldLabel);

        const field: any = {
          id: fieldId,
          label: fieldLabel,
          type: "text",
          required: false,
        };

        this.skipWhitespace();

        // Parse field properties
        while (this.currentLine < this.lines.length) {
          const propLine = this.peek();
          if (!propLine?.startsWith("    - ")) {
            break;
          }
          const prop = this.consume().slice(6).trim();
          this.parseProperty(field, prop);
        }

        block.children.push(field);
      } else {
        this.currentLine++;
      }
    }

    return block;
  }

  /**
   * Parse condition string (e.g., "status == Active")
   */
  private parseCondition(condStr: string): Condition {
    const operators = ["==", "!=", ">=", "<=", ">", "<", "in", "contains"];
    let operator: Condition["operator"] = "==";
    let parts = condStr.split(" ");

    for (const op of operators) {
      if (condStr.includes(` ${op} `)) {
        const [field, ...rest] = condStr.split(` ${op} `);
        operator = op as Condition["operator"];
        return {
          field: field.trim(),
          operator,
          value: rest.join(` ${op} `).trim(),
        };
      }
    }

    // Default fallback
    return {
      field: parts[0],
      operator: "==",
      value: parts.slice(1).join(" "),
    };
  }

  /**
   * Parse options list (e.g., "Active, Sold, Withdrawn")
   */
  private parseOptions(optStr: string): FieldOption[] {
    if (optStr.startsWith("[") && optStr.endsWith("]")) {
      optStr = optStr.slice(1, -1);
    }

    return optStr.split(",").map((opt) => {
      const trimmed = opt.trim();
      return {
        label: trimmed,
        value: this.sanitizeId(trimmed),
      };
    });
  }

  // ========== Helper Methods ==========

  private peek(): string | undefined {
    return this.lines[this.currentLine];
  }

  private consume(): string {
    return this.lines[this.currentLine++];
  }

  private skipWhitespace(): void {
    while (this.currentLine < this.lines.length && !this.peek()?.trim()) {
      this.currentLine++;
    }
  }

  private parseString(value: string): string {
    return value.replace(/^["']|["']$/g, "").trim();
  }

  private parseNumber(value: string): number {
    return parseInt(value, 10);
  }

  private parseBoolean(value: string): boolean {
    return ["true", "yes", "1"].includes(value.toLowerCase());
  }

  private sanitizeId(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
}

// ============================================================================
// Validator
// ============================================================================

export class TemplateValidator {
  validate(ast: FormAST): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!ast.title) {
      errors.push({ line: 1, message: "Form must have a title (# Title)" });
    }

    if (ast.pages.length === 0) {
      errors.push({ line: 1, message: "Form must have at least one section" });
    }

    for (const page of ast.pages) {
      for (const section of page.sections) {
        for (const field of section.fields) {
          if (field.type === "conditional") {
            this.validateConditional(field, errors);
          } else if (field.type !== "divider") {
            this.validateField(field, errors);
          }
        }
      }
    }

    return errors;
  }

  private validateField(field: Field, errors: ValidationError[]): void {
    if (!field.id) {
      errors.push({ line: 0, message: `Field must have an id` });
    }

    if (!field.label) {
      errors.push({ line: 0, message: `Field ${field.id} must have a label` });
    }

    if (field.type === "select" || field.type === "radio" || field.type === "checkbox") {
      const selectField = field as SelectField;
      if (!selectField.options || selectField.options.length === 0) {
        errors.push({
          line: 0,
          message: `Field ${field.id} (${field.type}) must have options`,
        });
      }
    }

    if (field.type === "signature") {
      const signatureField = field as SignatureField;
      if (!signatureField.required) {
        errors.push({
          line: 0,
          message: `Signature field ${field.id} must be required`,
        });
      }
    }
  }

  private validateConditional(block: ConditionalBlock, errors: ValidationError[]): void {
    if (!block.condition.field) {
      errors.push({ line: 0, message: "Conditional must reference a field" });
    }

    for (const child of block.children) {
      if (child.type === "conditional") {
        this.validateConditionalBlock(child, errors);
      } else if (child.type !== "divider") {
        this.validateField(child, errors);
      }
    }
  }
}

// ============================================================================
// HTML Renderer
// ============================================================================

export class TemplateRenderer {
  /**
   * Render AST to HTML form (without data injection)
   */
  renderHTML(ast: FormAST): string {
    let html = `<form class="form-template" data-title="${this.escapeHtml(ast.title)}">`;

    if (ast.title) {
      html += `<h1 class="form-title">${this.escapeHtml(ast.title)}</h1>`;
    }

    if (ast.description) {
      html += `<p class="form-description">${this.escapeHtml(ast.description)}</p>`;
    }

    for (let pageIdx = 0; pageIdx < ast.pages.length; pageIdx++) {
      const page = ast.pages[pageIdx];
      html += `<div class="form-page" data-page="${pageIdx}">`;

      for (const section of page.sections) {
        html += this.renderSection(section);
      }

      html += `</div>`;
    }

    html += `</form>`;
    return html;
  }

  private renderSection(section: Section): string {
    let html = `<div class="form-section" data-section="${section.id}">`;

    if (section.title) {
      html += `<h2 class="section-title">${this.escapeHtml(section.title)}</h2>`;
    }

    if (section.description) {
      // Split description into paragraphs and render each as separate <p> tag
      // This allows markdown-style multi-paragraph content in sections
      const paragraphs = section.description.split(/\n\s*\n/).filter(p => p.trim());
      for (const paragraph of paragraphs) {
        html += `<p class="section-description">${this.escapeHtml(paragraph.trim())}</p>`;
      }
    }

    for (const field of section.fields) {
      html += this.renderFieldContainer(field);
    }

    html += `</div>`;
    return html;
  }

  private renderFieldContainer(container: FieldContainer): string {
    if (container.type === "divider") {
      return `<hr class="form-divider" />`;
    }

    if (container.type === "conditional") {
      return this.renderConditional(container);
    }

    return this.renderField(container);
  }

  private renderField(field: Field): string {
    let html = `<div class="form-field" data-field="${field.id}" data-type="${field.type}">`;

    // Label
    html += `<label for="${field.id}" class="field-label">`;
    html += this.escapeHtml(field.label);
    if (field.required) {
      html += `<span class="required-indicator">*</span>`;
    }
    html += `</label>`;

    // Description/help text
    if (field.description) {
      html += `<p class="field-description">${this.escapeHtml(field.description)}</p>`;
    }

    // Input element
    html += this.renderInput(field);

    // Help text
    if (field.helpText) {
      html += `<small class="field-help">${this.escapeHtml(field.helpText)}</small>`;
    }

    html += `</div>`;
    return html;
  }

  private renderInput(field: Field): string {
    const attrs = `id="${field.id}" name="${field.id}"${
      field.required ? " required" : ""
    }${field.placeholder ? ` placeholder="${this.escapeHtml(field.placeholder)}"` : ""}`;

    if (field.type === "signature") {
      const signatureField = field as SignatureField;
      return `<div class="signature-field" data-signatory="${signatureField.signatory || ''}">
        <div class="signature-canvas-container">
          <canvas id="${field.id}-canvas" class="signature-canvas" width="400" height="150"></canvas>
          <button type="button" class="clear-signature">Clear</button>
        </div>
        <div class="signature-typed-container" style="display: none;">
          <input type="text" id="${field.id}-typed" placeholder="Type your name" class="signature-typed-input" />
          <label class="signature-agreement">
            <input type="checkbox" id="${field.id}-agreement" required />
            I agree this is my signature
          </label>
        </div>
        <div class="signature-mode-toggle">
          <button type="button" class="signature-mode-draw">Draw Signature</button>
          <button type="button" class="signature-mode-type">Type Name</button>
        </div>
        <input type="hidden" id="${field.id}" name="${field.id}" required />
      </div>`;
    }

    if (field.type === "select" || field.type === "radio" || field.type === "checkbox") {
      const selectField = field as SelectField;
      if (field.type === "select") {
        return `<select ${attrs} class="field-input">
          <option value="">Select...</option>
          ${selectField.options
            .map((opt) => `<option value="${opt.value}">${this.escapeHtml(opt.label)}</option>`)
            .join("")}
        </select>`;
      }

      // Radio or checkbox
      return `<div class="field-options">
        ${selectField.options
          .map(
            (opt) =>
              `<label class="option-label">
            <input type="${field.type}" name="${field.id}" value="${opt.value}" ${
                field.type === "checkbox" ? "" : ""
              } />
            ${this.escapeHtml(opt.label)}
          </label>`
          )
          .join("")}
      </div>`;
    }

    // Text-based input
    let inputType = field.type;
    if (inputType === "currency") inputType = "number";
    if (inputType === "text") inputType = "text";

    const textField = field as TextField;
    const numberAttrs =
      field.type === "currency" || field.type === "number"
        ? `${textField.min !== undefined ? ` min="${textField.min}"` : ""}${
            textField.max !== undefined ? ` max="${textField.max}"` : ""
          }${textField.step !== undefined ? ` step="${textField.step}"` : ""}`
        : "";

    if (field.type === "textarea") {
      return `<textarea ${attrs} class="field-input"${
        textField.maxLength ? ` maxlength="${textField.maxLength}"` : ""
      }></textarea>`;
    }

    return `<input type="${inputType}" ${attrs} class="field-input"${
      textField.minLength ? ` minlength="${textField.minLength}"` : ""
    }${textField.maxLength ? ` maxlength="${textField.maxLength}"` : ""}${numberAttrs} />`;
  }

  private renderConditional(block: ConditionalBlock): string {
    const condStr = this.renderConditionString(block.condition);
    let html = `<div class="form-conditional" data-condition="${this.escapeHtml(
      condStr
    )}" style="display: none;">`;

    for (const child of block.children) {
      if (child.type === "conditional") {
        html += this.renderConditionalBlock(child);
      } else if (child.type !== "divider") {
        html += this.renderField(child);
      }
    }

    html += `</div>`;
    return html;
  }

  private renderConditionString(condition: Condition): string {
    return `${condition.field} ${condition.operator} ${condition.value}`;
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

// ============================================================================
// Data Injector
// ============================================================================

export class DataInjector {
  /**
   * Inject data into an AST, replacing chip references with actual values
   */
  injectData(ast: FormAST, context: ChipContext): FormAST {
    const injected = JSON.parse(JSON.stringify(ast)); // Deep clone

    for (const page of injected.pages) {
      for (const section of page.sections) {
        for (const field of section.fields) {
          this.injectFieldData(field, context);
        }
      }
    }

    return injected;
  }

  private injectFieldData(container: FieldContainer, context: ChipContext): void {
    if (container.type === "divider") return;

    if (container.type === "conditional") {
      for (const child of container.children) {
        this.injectFieldData(child, context);
      }
      return;
    }

    const field = container as Field;
    if (field.chip) {
      const value = this.resolveChip(field.chip, context);
      if (value !== undefined) {
        // For display purposes, set a data attribute
        (field as any).__chipValue = value;
      }
    }
  }

  /**
   * Resolve a chip reference (e.g., "listing.salePrice") to actual value
   */
  private resolveChip(chip: string, context: ChipContext): any {
    const parts = chip.split(".");
    if (parts.length < 2) return undefined;

    const source = parts[0] as keyof ChipContext;
    const obj = context[source];
    if (!obj) return undefined;

    let current: any = obj;
    for (let i = 1; i < parts.length; i++) {
      current = current[parts[i]];
      if (current === undefined) return undefined;
    }

    return current;
  }
}

// ============================================================================
// Submission Validator
// ============================================================================

/**
 * Creates a Zod schema from a form template for validating submissions
 */
export function createSubmissionSchema(ast: FormAST): z.ZodType {
  const schemaObj: { [key: string]: z.ZodTypeAny } = {};

  for (const page of ast.pages) {
    for (const section of page.sections) {
      for (const fieldContainer of section.fields) {
        // Only create schema for actual fields, not conditional blocks or dividers
        if ('id' in fieldContainer && fieldContainer.type !== 'conditional' && fieldContainer.type !== 'divider') {
          const fieldSchema = createFieldSchema(fieldContainer);
          if (fieldSchema) {
            schemaObj[fieldContainer.id] = fieldSchema;
          }
        }
      }
    }
  }

  return z.object(schemaObj);
}

function createFieldSchema(container: FieldContainer): z.ZodTypeAny | null {
  if (container.type === "divider" || container.type === "conditional") {
    return null;
  }

  const field = container as Field;
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "text":
    case "email":
    case "textarea":
      schema = z.string();
      const textField = field as TextField;
      if (textField.minLength) schema = (schema as z.ZodString).min(textField.minLength);
      if (textField.maxLength) schema = (schema as z.ZodString).max(textField.maxLength);
      if (field.type === "email") schema = (schema as z.ZodString).email();
      break;

    case "number":
    case "currency":
      schema = z.number();
      const numField = field as TextField;
      if (numField.min !== undefined) schema = (schema as z.ZodNumber).min(numField.min);
      if (numField.max !== undefined) schema = (schema as z.ZodNumber).max(numField.max);
      break;

    case "date":
    case "time":
    case "datetime":
      schema = z.string().datetime();
      break;

    case "select":
    case "radio":
      const selectField = field as SelectField;
      const values = selectField.options.map((o) => o.value);
      schema = z.enum(values as [string, ...string[]]);
      break;

    case "checkbox":
      const checkField = field as SelectField;
      const checkValues = checkField.options.map((o) => o.value);
      schema = z.array(z.enum(checkValues as [string, ...string[]]));
      break;

    case "signature":
      // Signature fields always return an object with signature data
      schema = z.object({
        type: z.enum(["canvas", "typed"]),
        data: z.string(), // Base64 canvas data or typed name
        timestamp: z.string(),
        signatory: z.string().optional(),
        signingDate: z.string().optional(), // Today's date in YYYY-MM-DD format
        formattedTimestamp: z.string().optional(), // Formatted timestamp for display
      });
      break;

    default:
      schema = z.string();
  }

  return field.required ? schema : schema.optional();
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Parse markdown template string to AST
 */
export function parseTemplate(markdown: string): { ast: FormAST; errors: ValidationError[] } {
  const parser = new TemplateParser(markdown);
  const ast = parser.parse();

  const validator = new TemplateValidator();
  const errors = validator.validate(ast);

  return { ast, errors };
}

/**
 * Render AST to HTML form
 */
export function renderTemplate(ast: FormAST): string {
  const renderer = new TemplateRenderer();
  return renderer.renderHTML(ast);
}

/**
 * Inject data into template and render
 */
export function renderWithData(ast: FormAST, context: ChipContext): string {
  const injector = new DataInjector();
  const injected = injector.injectData(ast, context);

  const renderer = new TemplateRenderer();
  return renderer.renderHTML(injected);
}

/**
 * Get Zod validation schema for a template
 */
export function getSubmissionSchema(ast: FormAST) {
  return createSubmissionSchema(ast);
}
