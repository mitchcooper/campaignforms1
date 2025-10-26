/**
 * Template Processor
 *
 * Handles server-side template processing, validation, compilation, and
 * data injection for form submissions.
 */

import {
  parseTemplate,
  renderTemplate,
  renderWithData,
  getSubmissionSchema,
  FormAST,
  ValidationError,
  ChipContext,
  DataInjector,
  TemplateRenderer,
} from "@shared/template-parser";

export interface CompiledForm {
  templateMarkdown: string;
  ast: FormAST;
  htmlPreview: string;
  validator: any; // Zod schema
  chipReferences: string[];
  errors: ValidationError[];
  isValid: boolean;
}

export interface RenderedForm {
  html: string;
  hiddenFields?: Record<string, any>;
  pageCount: number;
}

export interface SubmissionValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  normalizedData?: Record<string, any>;
}

/**
 * Compile a markdown template string into a validated, cached form definition
 */
export function compileTemplate(markdown: string): CompiledForm {
  const { ast, errors } = parseTemplate(markdown);

  const isValid = errors.length === 0;

  let htmlPreview = "";
  let validator = null;

  if (isValid) {
    try {
      htmlPreview = renderTemplate(ast);
      validator = getSubmissionSchema(ast);
    } catch (e) {
      console.error("Error rendering template:", e);
    }
  }

  return {
    templateMarkdown: markdown,
    ast,
    htmlPreview,
    validator,
    chipReferences: ast.metadata.chipReferences,
    errors,
    isValid,
  };
}

/**
 * Render a compiled form with data injected from API/vendor/campaign sources
 */
export function renderFormWithData(
  compiled: CompiledForm,
  context: ChipContext
): RenderedForm {
  if (!compiled.isValid) {
    throw new Error("Cannot render invalid template");
  }

  const injector = new DataInjector();
  const injected = injector.injectData(compiled.ast, context);

  const renderer = new TemplateRenderer();
  const html = renderer.renderHTML(injected);

  return {
    html,
    pageCount: injected.pages.length,
  };
}

/**
 * Validate form submission data against template schema
 */
export function validateSubmission(
  compiled: CompiledForm,
  submissionData: Record<string, any>
): SubmissionValidationResult {
  if (!compiled.isValid || !compiled.validator) {
    return {
      isValid: false,
      errors: {
        _form: ["Template is invalid"],
      },
    };
  }

  try {
    const result = compiled.validator.safeParse(submissionData);

    if (result.success) {
      return {
        isValid: true,
        errors: {},
        normalizedData: result.data,
      };
    }

    // Collect Zod errors
    const errorMap: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!errorMap[path]) {
        errorMap[path] = [];
      }
      errorMap[path].push(issue.message);
    }

    return {
      isValid: false,
      errors: errorMap,
    };
  } catch (e) {
    console.error("Error validating submission:", e);
    return {
      isValid: false,
      errors: {
        _form: ["Validation error"],
      },
    };
  }
}

/**
 * Extract required chip data from a compiled form
 * Returns list of chip references that need to be resolved
 */
export function getRequiredChips(compiled: CompiledForm): string[] {
  return compiled.chipReferences;
}

/**
 * Check if all required chips are available in the context
 */
export function hasAllRequiredChips(
  compiled: CompiledForm,
  context: ChipContext
): { satisfied: boolean; missing: string[] } {
  const missing: string[] = [];
  const injector = new DataInjector();

  for (const chip of compiled.chipReferences) {
    const value = (injector as any).resolveChip(chip, context);
    if (value === undefined) {
      missing.push(chip);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}

/**
 * Create a normalized submission from validated data
 * Includes metadata about which template version was used
 */
export function normalizeSubmission(
  data: Record<string, any>,
  templateVersion: number
): Record<string, any> {
  return {
    ...data,
    _templateVersion: templateVersion,
    _submittedAt: new Date().toISOString(),
  };
}

/**
 * Cache for compiled templates (in production, use Redis or database)
 */
const templateCache = new Map<
  string,
  { compiled: CompiledForm; compiledAt: number }
>();

export const TEMPLATE_CACHE_TTL = 3600000; // 1 hour

/**
 * Get or compile a template with caching
 */
export function getOrCompileTemplate(formId: string, markdown: string): CompiledForm {
  const cached = templateCache.get(formId);

  if (cached && Date.now() - cached.compiledAt < TEMPLATE_CACHE_TTL) {
    return cached.compiled;
  }

  const compiled = compileTemplate(markdown);
  templateCache.set(formId, {
    compiled,
    compiledAt: Date.now(),
  });

  return compiled;
}

/**
 * Invalidate template cache (call when template is updated)
 */
export function invalidateTemplateCache(formId: string): void {
  templateCache.delete(formId);
}

/**
 * Clear entire template cache
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getTemplateCacheStats() {
  return {
    size: templateCache.size,
    items: Array.from(templateCache.entries()).map(([id, item]) => ({
      formId: id,
      age: Date.now() - item.compiledAt,
      valid: item.compiled.isValid,
    })),
  };
}

/**
 * Check if a compiled form has signature fields
 */
export function hasSignatureFields(compiled: CompiledForm): boolean {
  if (!compiled.isValid) return false;
  
  for (const page of compiled.ast.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        if (field.type === "signature") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Get all required non-signature fields from a compiled form
 */
export function getRequiredFieldsBeforeSigning(compiled: CompiledForm): string[] {
  if (!compiled.isValid) return [];
  
  const requiredFields: string[] = [];

  for (const page of compiled.ast.pages) {
    for (const section of page.sections) {
      for (const fieldContainer of section.fields) {
        // Skip non-field containers (ConditionalBlock, Divider)
        if ('type' in fieldContainer && fieldContainer.type !== 'conditional' && fieldContainer.type !== 'divider') {
          if (fieldContainer.type !== "signature" && fieldContainer.required) {
            requiredFields.push(fieldContainer.id);
          }
        }
      }
    }
  }

  return requiredFields;
}

/**
 * Validate that all required fields are completed before signing
 */
export function validateFormInstanceReadyToSign(
  compiled: CompiledForm, 
  formData: Record<string, any>
): { ready: boolean; missingFields: string[] } {
  if (!compiled.isValid) {
    return { ready: false, missingFields: [] };
  }
  
  const requiredFields = getRequiredFieldsBeforeSigning(compiled);
  const missingFields: string[] = [];
  
  for (const fieldId of requiredFields) {
    const value = formData[fieldId];
    if (value === undefined || value === null || value === "") {
      missingFields.push(fieldId);
    }
  }
  
  return {
    ready: missingFields.length === 0,
    missingFields,
  };
}
