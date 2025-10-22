# Harcourts Cooper & Co Campaign Forms

## Overview

This is an internal administration application for managing vendor campaign forms at Harcourts Cooper & Co. The system allows admins to create campaigns (representing properties/projects), manage multiple vendors per campaign (e.g., property co-owners), build global form templates using SurveyJS that are available to all campaigns, and collect submissions through tokenized access links. It's designed as a utility-focused tool prioritizing efficiency, clarity, and data management while following the Harcourts Cooper & Co brand identity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling

**Routing**: Wouter for client-side routing with two main route types:
- Admin routes with sidebar navigation (dashboard, campaigns, vendors, forms, submissions)
- Public vendor form route accessible via tokenized links

**State Management**: TanStack Query (React Query) for server state management with configured defaults for query caching and refetching behavior

**Form Builder**: SurveyJS integration for dynamic form creation and rendering:
- `survey-creator-react` for the admin form builder interface
- `survey-react-ui` for rendering forms on the vendor-facing pages
- Form definitions stored as JSON in the database

**Design System**: Custom theme based on Harcourts Cooper & Co brand guidelines:
- Primary colors: Navy (#001F3A) and Cyan (#00AEEF)
- Typography: Source Sans Pro for all text
- Glassmorphic card components for visual depth
- 8-point grid spacing system

### Backend Architecture

**Framework**: Express.js server with TypeScript

**API Design**: RESTful endpoints organized by resource:
- `/api/campaigns` - Campaign CRUD operations
- `/api/vendors` - Vendor management
- `/api/forms` - Form definition management
- `/api/submissions` - Form submission storage and retrieval
- `/api/links` - Access link generation and resolution
- `/api/stats` - Dashboard statistics

**Data Validation**: Zod schemas for runtime type validation, integrated with Drizzle ORM schema definitions

**Session Management**: Express sessions with PostgreSQL session store using `connect-pg-simple`

**Development Setup**: Vite middleware integration for hot module replacement in development, with custom logging and error handling

### Data Storage

**Database**: PostgreSQL via Neon serverless with WebSocket connections

**ORM**: Drizzle ORM for type-safe database queries

**Schema Structure**:
- `campaigns` - Campaign metadata representing property/project entry points (e.g., "20 James Street")
- `vendors` - Multiple people associated with a campaign (e.g., property co-owners) who need form access
- `forms` - Global SurveyJS form templates available to all campaigns, stored as JSON with versioning
- `submissions` - Form submission data with relationships to forms, campaigns, and vendors
- `access_links` - Tokenized links connecting vendors to specific forms with expiration tracking

**Relationships**:
- Campaigns have many vendors (one property can have multiple owners/stakeholders)
- Vendors belong to a single campaign
- Forms are global and not tied to any specific campaign (available to all campaigns)
- Submissions link to forms, campaigns (via vendor), and vendors
- Access links connect vendors to specific forms with token-based security

**Migration Strategy**: Drizzle Kit for schema migrations with PostgreSQL dialect

### External Dependencies

**UI Libraries**:
- Radix UI primitives for accessible component foundations
- Tailwind CSS for utility-first styling
- Lucide React for icons
- date-fns for date formatting

**Form Building**:
- SurveyJS Core and Creator packages for dynamic form creation
- Forms stored as JSON schemas allowing runtime rendering

**Database**:
- Neon PostgreSQL serverless database
- WebSocket support for serverless environments
- Drizzle ORM for database interactions

**Development Tools**:
- Replit-specific Vite plugins for development banner and cartographer
- TSX for TypeScript execution
- ESBuild for production builds

**Key Design Decisions**:
- Tokenized access links instead of authentication for vendor forms to simplify user experience
- JSON storage for form definitions to leverage SurveyJS flexibility
- Separation of public and admin routes with different layouts
- Server-side session management for admin authentication (implementation pending)
- Single-page application architecture with client-side routing