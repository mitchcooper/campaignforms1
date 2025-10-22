# Harcourts Cooper & Co Campaign Forms - Design Guidelines

## Design Approach
**Utility-Focused Internal Application** - This is an admin tool prioritizing efficiency, clarity, and data management. Design follows Harcourts Cooper & Co brand identity while optimizing for daily operational use.

## Brand Foundation

### Color Palette
**Primary Colors:**
- Navy: 210 100% 11% (Primary brand, headers, navigation)
- Cyan: 195 100% 47% (Interactive elements, CTAs, active states)
- White: 0 0% 100% (Base background)

**Neutrals:**
- Grey 200: 0 0% 95% (Subtle backgrounds, disabled states)
- Grey 400: 0 0% 80% (Borders, dividers)
- Grey 700: 0 0% 40% (Secondary text, labels)

**Semantic Colors:**
- Success: 142 71% 45% (Submissions confirmed, active campaigns)
- Warning: 38 92% 50% (Expiring links, pending actions)
- Error: 0 84% 60% (Failed submissions, validation errors)

### Typography
**Typeface:** Source Sans Pro (all contexts)
- H1 (Page Headers): Bold, 32px, Navy, tracking -0.02em
- H2 (Section Headers): Semibold, 24px, Navy
- H3 (Card Titles): Semibold, 18px, Navy
- Body: Regular, 15px, Grey 700, leading 1.6
- Labels: Semibold, 13px, Grey 700, uppercase tracking 0.05em
- Table Headers: Semibold, 14px, Grey 700

### Layout System
**Spacing Units:** 4, 8, 12, 16, 24, 32, 48, 64 (8-point grid)
- Page margins: 32px
- Card padding: 24px
- Form spacing: 16px between fields
- Table row height: 56px
- Section gaps: 48px

**Radius Values:**
- Small (inputs, pills): 8px
- Medium (cards, modals): 12px
- Large (hero sections): 16px

## Core Components

### Navigation & Layout
**Top Navigation Bar:**
- Navy background with white text
- Height: 64px
- Logo left-aligned with proper clearspace
- Navigation links: white text, cyan underline on active
- User profile/role indicator right-aligned

**Sidebar (if implemented):**
- White background with grey 200 dividers
- Width: 240px, collapsible to 64px icon-only
- Active item: cyan accent stripe, light grey 200 background

**Page Structure:**
- Max width: 1280px, centered
- Content gutters: 32px
- Breadcrumbs: grey 700 text with cyan separators

### Data Tables
**Design Approach:**
- White background, clean grid lines using grey 400
- Header row: grey 200 background, semibold labels
- Row hover: grey 200 background
- Row height: 56px with 16px vertical padding
- Left-align text, right-align numbers
- Sortable columns: small arrow indicator
- Pagination: cyan buttons, showing "1-10 of 145"

**Filtering:**
- Filter bar above table with dropdown selects and search input
- Light glassmorphism card: rgba(255,255,255,0.6), 10px blur
- Clear/Reset filters: outline button

### Cards
**Standard Card:**
- White background or light glass (rgba(255,255,255,0.6))
- 12px radius, 1px grey 400 border
- 24px padding
- Shadow: 0 2px 8px rgba(0,0,0,0.04)
- Header with title and optional actions
- Optional divider between sections

**Stat Cards (Dashboard):**
- Navy or cyan primary color with white text
- Large number display (32px bold)
- Descriptor label below (14px regular)
- Small trend indicator if applicable

### Forms & Inputs
**Input Fields:**
- White background, 1px grey 400 border
- 8px radius, 12px padding
- Focus: 2px cyan ring
- Labels above: semibold, 13px, grey 700
- Helper text below: regular, 13px, grey 700
- Error state: red border, red helper text

**Buttons:**
- Primary: Navy background, white text, 8px radius
- Secondary: Outline navy, navy text on white
- Ghost: Transparent, navy text, hover grey 200
- Size: 40px height, 16px horizontal padding
- Focus: 2px cyan ring offset

**Form Layout:**
- Single column default
- Two columns only on wide screens (>1024px) for related fields
- 16px spacing between fields
- Group related fields with subtle dividers

### SurveyJS Form Builder Interface
**Creator Panel:**
- Full-width layout with minimal chrome
- Toolbox sidebar: white background, 240px width
- Property panel: right-aligned, 280px width
- Canvas: grey 200 background with white form preview
- Maintain brand colors in preview mode

**Form Preview (Vendor Portal):**
- Clean white card, 12px radius
- Navy headings, grey 700 body text
- Cyan progress bar if multi-page
- Submit button: cyan background, white text

### Modals & Overlays
**Modal Structure:**
- Light glassmorphism: rgba(255,255,255,0.85), 12px blur
- 16px radius, max-width 600px
- Header: navy text, close button top-right
- Actions: right-aligned, primary + ghost pattern
- Backdrop: rgba(0,31,58,0.4)

### Empty States
**Design:**
- Simple icon (grey 400, 48px)
- Short message: semibold, 16px, grey 700
- Action button: cyan primary
- Centered vertically and horizontally in container

## Page-Specific Guidance

### Dashboard
- Grid of stat cards (4 columns on desktop)
- Recent activity table below
- Quick actions: cyan CTAs for common workflows
- Charts (if needed): use cyan/navy color scheme

### Campaign Management
- Table view with campaign name, status badge, dates, owner
- Status badges: colored pills (draft=grey, active=cyan, archived=navy)
- Row actions: edit, archive, view vendors
- Create campaign: prominent cyan button top-right

### Vendor Management
- Table with vendor name, email, campaign, submission status
- "Issue Form Link" action: generates tokenized URL
- URL display: monospace font, copy button
- Filter by campaign via dropdown

### Form Builder
- Full-screen creator interface
- Save button: always visible, sticky header
- Version indicator subtle in corner
- Active toggle prominent

### Submissions View
- Table with timestamp, campaign, vendor, form name
- Row click: expand to show JSON preview
- JSON preview: code block style, grey 200 background, 12px padding
- Export button: download as CSV

## Accessibility & Interactions
- All interactive elements meet WCAG AA contrast
- Focus indicators: 2px cyan ring
- Keyboard navigation fully supported
- Motion: 150-250ms transitions, respects prefers-reduced-motion
- Loading states: navy spinner or cyan progress bar

## Photography & Imagery
**Not Applicable** - This is an internal admin tool focused on data management. No hero images or lifestyle photography needed. Use simple iconography where helpful (campaign icons, status indicators).

## Critical Don'ts
- Do not alter Harcourts logo lock-up
- Do not use gradients excessively
- Do not mix type sizes inconsistently
- Do not use glassmorphism on content-heavy tables
- Do not sacrifice readability for aesthetics

This design system prioritizes operational efficiency while maintaining Harcourts Cooper & Co's professional brand identity.