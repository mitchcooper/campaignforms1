# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Campaign Forms Application** built with Express.js backend and React frontend. It integrates with the **Cooper & Co real estate API** to manage property campaigns and collect vendor form submissions.

**Key Features:**
- Campaign management with listing data from Cooper API
- Multi-vendor form distribution with tokenized access links
- Template-based form builder with markdown syntax
- **AI Form Wizard** - Convert PDF forms or text descriptions to templates using OpenAI Vision
- Digital signature support with multi-signatory workflows
- Submission tracking and analytics
- Vendor portal for form completion

## Development Commands

### Core Commands
- **`npm run dev`** - Start development server with hot reload (Node.js + Vite)
- **`npm run build`** - Build for production (Vite client + esbuild server)
- **`npm start`** - Run production build
- **`npm run check`** - TypeScript type checking
- **`npm run db:push`** - Push schema changes to database (Drizzle)

### Database
- Database is PostgreSQL (Neon serverless)
- Schema is defined in `shared/schema.ts` using Drizzle ORM
- Run migrations with `npm run db:push` when schema changes
- Database URL must be set in environment variables

## Architecture Overview

### Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, React Router (wouter), React Query (TanStack Query)
- **UI:** Radix UI components + Tailwind CSS (see design_guidelines.md for Harcourts Cooper & Co brand standards)
- **Backend:** Express.js with ES modules
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Forms:** Custom markdown-based template system with signature support
- **Additional:** Framer Motion, Recharts, React Hook Form

### Project Structure

```
/client/src           # React frontend
  /pages            # Route pages (dashboard, campaigns, forms, etc.)
  /components       # Reusable React components
  /lib              # Utilities (queryClient, helpers)

/server               # Express.js backend
  index.ts          # App setup and middleware
  routes.ts         # API endpoints
  storage.ts        # Database access layer (IStorage interface)
  db.ts             # Drizzle ORM setup
  cooper-api.ts     # Cooper & Co API integration
  vite.ts           # Vite dev server setup

/shared               # Shared code
  schema.ts         # Drizzle table definitions + Zod schemas

/migrations           # Drizzle migrations (auto-generated)
```

### Key Data Models

**Campaigns** - Property campaigns with optional Cooper API listing data
- Can link to Cooper API listings (`listingId`, `listingData`)
- Can have manual addresses without API link
- Track dates and status (draft, active, archived)

**Vendors** - Recipients of campaign forms
- Belong to campaigns
- Have contact info and metadata
- Receive forms via tokenized access links

**Forms** - Template-based form definitions
- Global forms available to all campaigns
- Stored as markdown templates (not SurveyJS JSON)
- Includes cached AST and HTML preview
- Versioned and can be active/inactive

**Submissions** - Form responses
- Link form, campaign, and vendor
- Store flat JSON data (not SurveyJS)
- Track template version and timestamps
- Can link to form instance for multi-signatory forms

**Form Instances** - Shared form state for multi-signatory forms
- Contains shared field data that all signatories can access
- Tracks signing status: draft, ready_to_sign, partially_signed, completed
- Supports signing modes: "all" (all must sign) or "any" (any one can sign)

**Signatories** - Track who needs to sign each form instance
- Links to form instance and access link
- Records signatory information (name, email)
- Stores signature data (canvas or typed)
- Tracks when each signatory signed

**Access Links** - Tokenized public links for vendor form access
- Expire after set time
- Track when used
- Allow vendors to access forms without authentication
- Can be linked to form instances for multi-signatory workflows
- Optional signatory role for display purposes

**Campaign Forms** - Junction table tracking which forms sent to campaigns
- Denormalizes campaign-form relationship
- Tracks send date and status

### Database Connection

- Uses Neon serverless PostgreSQL with WebSocket support
- Connection configured in `server/db.ts` via `DATABASE_URL` environment variable
- Schema lives in `shared/schema.ts` - edit here then run `npm run db:push`

### API Endpoints

All API routes follow REST conventions:

**Campaigns:**
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

**Vendors, Forms, Submissions, Access Links** - Similar CRUD patterns
- `GET /api/vendors?campaignId=X` - Filter vendors by campaign
- `GET /api/forms` - List all forms
- `POST /api/submissions` - Create form submission

**Special endpoints:**
- `GET /api/stats` - Dashboard statistics
- `POST /api/campaigns/:id/link-listing` - Link Cooper API listing
- `POST /api/campaigns/:id/send-form` - Send form to campaign vendors

**Cooper API Proxy Endpoints:**
- `GET /api/cooper/listings/search` - Search properties with filtering
- `GET /api/cooper/listings/:id` - Get property details
- `GET /api/cooper/branches` - Get Cooper & Co branches

See `server/routes.ts` for complete endpoint list.

### Cooper & Co API Integration

The `server/cooper-api.ts` module handles integration with `api.cooperandco.co.nz`:

**Authentication:** OAuth 2.0 password grant at `https://auth.cooperandco.co.nz/connect/token`

**Key Features:**
- Automatic token management with expiration tracking
- Request deduplication to prevent duplicate API calls
- Retry logic with exponential backoff
- Circuit breaker pattern for API failures
- Intelligent caching with TTL

**API Endpoints:**
- `GET /api/cooper/listings/search` - Search properties with filtering and pagination
- `GET /api/cooper/listings/:id` - Get detailed property information
- `GET /api/cooper/branches` - Get list of Cooper & Co branches/offices

**Environment Variables:**
- `COOPER_API_USERNAME` - API username
- `COOPER_API_PASSWORD` - API password
- `COOPER_API_URL` - API base URL (default: https://api.cooperandco.co.nz)
- `COOPER_AUTH_URL` - Auth URL (default: https://auth.cooperandco.co.nz/connect/token)

**Query Parameters for Search:**
- `count` (1-100, default: 100)
- `expand` - Comma-separated: users,branch,listingPhotos,listingOpenHomes
- `listingStatuses` - Array: available, underOffer, sold
- `listingTypes` - Array: residentialSale, ruralSale
- `listingBranchId` - Office/branch ID filter
- `searchText` - Text search across property fields
- `soldDateFrom` - ISO date for sold properties (default: 2020-09-30T11:00:00.000Z)
- `cursor` - Pagination cursor

**Response Structure:**
The API client transforms Cooper API responses to a standardized format:
```typescript
interface PropertySearchResponse {
  items: Property[];
  count: number;
  nextCursor?: string;
  hasMore: boolean;
}
```

**Usage in the App:**
1. **Campaign Management** - Link Cooper listings to campaigns via `CooperListingDialog`
2. **Property Search** - Search and filter properties by address, status, office
3. **Data Refresh** - Refresh listing data to get latest property information
4. **Form Auto-fill** - Use listing data as chips in form templates

**Error Handling:**
- Automatic token refresh on 401 errors
- Exponential backoff retry (3 attempts)
- Request deduplication prevents duplicate calls
- Circuit breaker opens after 5 consecutive failures

**Implementation Details:**

The `CooperAPIClient` class provides a robust wrapper around the Cooper API:

```typescript
// Token management with automatic refresh
class TokenManager {
  async getValidToken(): Promise<string>
  private isTokenExpired(): boolean
  private async authenticate(): Promise<AuthToken>
}

// Request deduplication to prevent duplicate calls
class RequestDeduplicator<T> {
  async deduplicate(key: string, requestFn: () => Promise<T>): Promise<T>
}

// Retry logic with exponential backoff
class RetryableAPIClient {
  async withRetry<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T>
}
```

**Frontend Integration:**

The frontend accesses Cooper API through proxy endpoints:
- `CooperListingDialog` component for property search and selection
- Real-time search with debouncing (500ms)
- Filtering by status (available, underOffer, sold) and office
- Property preview with photos, pricing, and agent information

## Frontend Routing

Uses `wouter` for routing. Key routes:

**Admin Routes (with sidebar):**
- `/` - Dashboard
- `/campaigns` - Campaign list
- `/campaigns/:id/manage` - Campaign details
- `/vendors` - All vendors
- `/forms` - Form templates
- `/forms/:id/builder` - Form template editor (markdown-based)
- `/submissions` - View submissions

**Public Routes (no sidebar):**
- `/form/:token` - Vendor form completion (tokenized link)
- `/portal/:vendorId` - Vendor portal

## State Management & Data Fetching

- Uses **TanStack React Query (react-query)** for server state
- Query client configured in `client/src/lib/queryClient.ts`
- Keep queries organized by resource type
- Use React Query's automatic refetching and caching

## Styling & Design

- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Unstyled accessible component primitives
- Theme variables in `tailwind.config.ts`
- Custom CSS modules are in component files
- **Brand Guidelines** - See `design_guidelines.md` for Harcourts Cooper & Co specific styling:
  - Navy (#001F3A) primary, Cyan (#00AEEF) accent
  - Source Sans Pro typography
  - Light glassmorphism for overlays
  - 8-point spacing grid
  - Accessible contrast (WCAG AA)

## Development Tips

### TypeScript
- Path aliases: `@/*` points to `client/src/`, `@shared/*` points to `shared/`
- Type checking: `npm run check` (runs `tsc --noEmit`)
- Strict mode enabled

### Adding a New Page
1. Create file in `client/src/pages/YourPage.tsx`
2. Add route in `App.tsx` inside Router component
3. Export page as default

### Adding a New API Endpoint
1. Add validation schema in `shared/schema.ts` if needed
2. Implement storage method in `server/storage.ts`
3. Add route handler in `server/routes.ts`

### Database Schema Changes
1. Edit `shared/schema.ts`
2. Run `npm run db:push` to migrate
3. Drizzle will generate migration files in `/migrations`

### Testing Vendor Form Links
- Access forms via: `http://localhost:5000/form/:token`
- The token comes from `accessLinks` table
- Forms are public and don't require authentication

## Build Process

**Development:**
- Vite runs React dev server
- Express serves both API and Vite dev server
- Hot module reload enabled
- Type checking on every check command

**Production:**
1. Vite builds React app to `dist/public`
2. esbuild bundles server to `dist/index.js`
3. Node runs the single bundled server
4. Server serves static assets + API

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `NODE_ENV` - `development` or `production`
- `PORT` - Port to serve on (default 5000)

Optional:
- `COOPER_API_USERNAME` - Cooper API username
- `COOPER_API_PASSWORD` - Cooper API password
- `COOPER_API_URL` - Cooper API base URL (default: https://api.cooperandco.co.nz)
- `COOPER_AUTH_URL` - Cooper auth URL (default: https://auth.cooperandco.co.nz/connect/token)
- `OPENAI_API_KEY` - OpenAI API key for AI Form Wizard feature

## Form Template System

The application uses a custom markdown-based form templating system (replaced SurveyJS). This allows for:
- Simple, human-readable form definitions
- Easy version control of form templates
- Auto-fill capabilities with data "chips"
- Conditional field visibility
- Multi-page forms

### Key Modules

**`shared/template-parser.ts`**
- Parses markdown templates to AST
- Validates form structure
- Renders to HTML
- Generates Zod schemas for submission validation
- See: `shared/template-parser.README.md`

**`server/template-processor.ts`**
- Compiles templates with caching
- Validates submissions against schemas
- Handles data injection for auto-fill
- See: `server/template-processor.README.md`

**Form Components**
- `FormTemplateEditor` - Markdown editor with live preview
- `DynamicFormRenderer` - Interactive form renderer with validation
- See: `client/src/components/FORM_COMPONENTS.md`

### Template Language Example

```markdown
# Vendor Inquiry Form
Please provide your information

## Personal Details

### Full Name
- label: "Your Name"
- field: fullName
- required: true
- chip: vendor.name

### Email
- field: email
- type: email
- required: true
- chip: vendor.email

## Property Interest

### Budget
- field: budget
- type: currency
- chip: listing.salePrice

## Signature

### Your Signature
- field: signature
- type: signature
- required: true
- signatory: "John Smith"
```

See `TEMPLATE_SYSTEM.md` for complete template language specification and `TEMPLATE_CHIPS.md` for all available chip references.

### Signature Fields and Multi-Signatory Forms

The template system supports digital signature fields with two signature types:
- **Canvas signatures** - Draw signature on canvas
- **Typed signatures** - Type name with auto-generated signature style

When a form contains signature fields, it can be sent to multiple signatories:
1. Create a **Form Instance** with shared form data
2. Add multiple **Signatories** with individual access links
3. Set signing mode: "all" (everyone must sign) or "any" (any one can sign)
4. Each signatory gets their own tokenized link
5. Form instance tracks overall status and completion

Signature data includes type, timestamp, signatory name, and optional signing date.

### AI Form Wizard

The application includes an AI-powered form generation feature using OpenAI Vision (GPT-4o):

**Features:**
- **PDF Upload Mode**: Upload a PDF form, and AI analyzes the visual layout to generate a template
  - Recognizes field types (text, checkboxes, signature boxes, currency, etc.)
  - Identifies visual hierarchy and sections
  - Detects which fields should use chips for auto-fill
  - Preserves original form text and structure

- **Description Mode**: Describe your form in plain text, and AI creates a template
  - Natural language input: "Create a vendor authority form with..."
  - Automatically selects appropriate field types
  - Suggests chip usage for common fields

**How it works:**
1. User clicks "AI Form Wizard" button on Forms page
2. Uploads PDF or enters description
3. AI processes using GPT-4o Vision (for PDFs) or GPT-4o (for descriptions)
4. Generated template is validated and created as a new form
5. User is redirected to the builder to review and edit

**API Endpoint:**
```
POST /api/forms/wizard
- Multipart: { pdf: File, instructions?: string }
- OR JSON: { description: string }
```

**Configuration:**
- Requires `OPENAI_API_KEY` environment variable
- Max file size: 10MB
- Only PDF files accepted for uploads
- Uses GPT-4o model for best results

**Implementation:**
- Backend: `server/openai-service.ts` - OpenAI Vision integration
- Frontend: `client/src/components/form-wizard-dialog.tsx` - UI component
- Endpoint: `/api/forms/wizard` in `server/routes.ts`

### Database Changes

Forms table:
- Now stores `template` (markdown) instead of `json`
- Includes `ast` (parsed AST for performance)
- Includes `htmlPreview` (cached HTML)

Submissions table:
- Stores flat JSON data instead of SurveyJS structure
- Tracks `templateVersion` to support versioning
- Added `startedAt` and `completedAt` timestamps

Run migrations: `npm run db:push`

---

## Documentation Files

- **TEMPLATE_SYSTEM.md** - Complete form templating system guide
- **TEMPLATE_CHIPS.md** - All available chip references (vendor, campaign, listing data)
- **design_guidelines.md** - Harcourts Cooper & Co UI/UX brand standards
- **shared/template-parser.README.md** - Template parser API documentation
- **server/template-processor.README.md** - Template processor API documentation
- **client/src/components/FORM_COMPONENTS.md** - React form component documentation

---

## Important Notes

- The app serves both frontend and API from a single port
- In production, Vite build outputs to `dist/public` and Express serves it as static
- Access links are tokenized for public vendor access without auth
- Form data is now stored as flat JSON (not SurveyJS)
- Database uses Neon serverless PostgreSQL with WebSocket support for connection pooling
- SurveyJS has been removed; templates use custom markdown-based system
