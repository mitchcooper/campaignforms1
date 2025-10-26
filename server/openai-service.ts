import OpenAI from "openai";
import { pdf } from "pdf-to-img";
import fs from "fs/promises";
import path from "path";

// Lazy-initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

// Load template system documentation
const TEMPLATE_SYSTEM_DOCS = `# Form Template System Reference

## Syntax Overview

The template language is markdown-inspired:

\`\`\`markdown
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
\`\`\`

## Field Types
- text, email, number, currency, date, time, datetime
- textarea, select, radio, checkbox
- signature (for digital signatures)

## Chip References (Pre-fill Data)

Use chips to auto-fill fields from application data:

**Vendor Data:**
- vendor.name, vendor.email, vendor.phone
- vendor.meta.* (custom fields)

**Campaign Data:**
- campaign.name, campaign.status, campaign.manualAddress
- campaign.listingId

**Listing Data (Cooper API):**
- listing.displayAddress, listing.salePrice, listing.internetPrice
- listing.bedrooms, listing.bathrooms, listing.propertyTypeName
- listing.users[0].name, listing.users[0].email (agent info)
- listing.branch.name, listing.branch.businessPhone

## Formatting Pre-filled Data

1. **Non-editable data** - Use bold markdown in descriptions:
   \`\`\`markdown
   **Property Address:** {{listing.displayAddress}}
   \`\`\`

2. **Editable pre-filled data** - Use chip property:
   \`\`\`markdown
   ### Property Address
   - field: address
   - chip: listing.displayAddress
   - type: textarea
   \`\`\`

## Examples

\`\`\`markdown
# Vendor Authority Form

**Property:** {{listing.displayAddress}}
**Campaign:** {{campaign.name}}

## Vendor Information

### Full Name
- label: "Your Full Name"
- field: vendorName
- required: true
- chip: vendor.name

### Email Address
- label: "Email"
- field: email
- type: email
- required: true
- chip: vendor.email

## Property Details

### Sale Price
- label: "Listing Price"
- field: salePrice
- type: currency
- chip: listing.salePrice

## Authorization

### Your Signature
- label: "Sign Here"
- field: signature
- type: signature
- required: true
\`\`\`
`;

/**
 * Generate a form template from a PDF file using OpenAI Vision
 */
export async function generateTemplateFromPDF(
  pdfPath: string,
  userInstructions?: string
): Promise<{ template: string; analysis: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  try {
    // Convert PDF pages to images
    const images: string[] = [];
    const document = await pdf(pdfPath, { scale: 2.0 });

    for await (const page of document) {
      // Convert page to base64
      const base64Image = page.toString("base64");
      images.push(base64Image);
    }

    if (images.length === 0) {
      throw new Error("No pages found in PDF");
    }

    // Prepare messages with all pages
    const imageMessages = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/png;base64,${img}`,
        detail: "high" as const,
      },
    }));

    const systemPrompt = `You are an expert at converting paper forms into digital form templates.

${TEMPLATE_SYSTEM_DOCS}

## Your Task

1. Carefully analyze the provided form PDF image(s)
2. Identify ALL fields, checkboxes, signature boxes, and sections
3. Determine which fields should be pre-filled using "chips" from the application data (vendor, campaign, listing)
4. Convert the form into the markdown template format above

## Guidelines

- **Preserve original text**: Keep form labels, descriptions, and instructions as-is (only minor changes for digital adaptation)
- **Smart chip usage**: Use chips for data that should be pre-filled (names, addresses, property details, etc.)
- **Non-editable pre-filled data**: Use bold markdown like **Property:** {{listing.displayAddress}}
- **Editable pre-filled data**: Use chip property on field definitions
- **Field types**: Match visual elements to correct types (checkboxes→checkbox, signature boxes→signature, $→currency, dates→date)
- **Signature fields**: Always include timestamp capture for signature fields:
  - Add captureTimestamp: true to automatically capture signing time
  - Add timestampFormat: "d MMM yyyy, h:mm a zzz" for readable timestamp format
  - Add embedTimestamp: true to display timestamp within the signature field
- **Layout**: Use sections (##) and subsections to match the visual hierarchy
- **Required fields**: Mark fields as required: true if they appear mandatory (asterisks, "required" text, etc.)

Return ONLY the markdown template, no explanations.`;

    const userPrompt = userInstructions
      ? `Additional instructions: ${userInstructions}\n\nNow convert this form to the template format:`
      : "Convert this form to the template format:";

    // Call OpenAI Vision API
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent output
    });

    const generatedTemplate = response.choices[0]?.message?.content;

    if (!generatedTemplate) {
      throw new Error("OpenAI returned empty response");
    }

    // Extract template from markdown code blocks if present
    let template = generatedTemplate.trim();
    const codeBlockMatch = template.match(/```(?:markdown)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      template = codeBlockMatch[1].trim();
    }

    return {
      template,
      analysis: `Generated from ${images.length} page(s) using GPT-4o Vision`,
    };
  } catch (error) {
    console.error("Error generating template from PDF:", error);
    throw error;
  }
}

/**
 * Generate a form template from a text description using OpenAI
 */
export async function generateTemplateFromDescription(
  description: string
): Promise<{ template: string; analysis: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  try {
    const openai = getOpenAIClient();
    const systemPrompt = `You are an expert at creating digital form templates.

${TEMPLATE_SYSTEM_DOCS}

## Your Task

Create a form template based on the user's description. Use the markdown template format above.

## Guidelines

- Use appropriate field types for the described fields
- Use chips for data that should be pre-filled (vendor, campaign, listing data)
- Create sensible sections and layout
- Mark fields as required if they seem mandatory
- Include helpful labels and descriptions

Return ONLY the markdown template, no explanations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Create a form template for: ${description}`,
        },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });

    const generatedTemplate = response.choices[0]?.message?.content;

    if (!generatedTemplate) {
      throw new Error("OpenAI returned empty response");
    }

    // Extract template from markdown code blocks if present
    let template = generatedTemplate.trim();
    const codeBlockMatch = template.match(/```(?:markdown)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      template = codeBlockMatch[1].trim();
    }

    return {
      template,
      analysis: "Generated from text description using GPT-4o",
    };
  } catch (error) {
    console.error("Error generating template from description:", error);
    throw error;
  }
}
