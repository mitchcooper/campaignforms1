# Template Chips Reference Guide

## Overview

Template "chips" are data field references that allow form templates to automatically pre-fill fields with data from your application's database and external APIs. This guide catalogs all available chips organized by their data sources.

## Chip Syntax

Use the `chip` property in your template fields to reference data:

```markdown
### Property Price
- field: price
- chip: listing.salePrice

### Vendor Name  
- field: vendorName
- chip: vendor.name
```

## Data Sources

The template system provides access to three main data sources:

1. **Vendor Data** - Information about the person filling out the form
2. **Campaign Data** - Information about the property campaign/project
3. **Listing Data** - Detailed property information from Cooper & Co API

---

## Vendor Data Chips

Vendor data comes from the application's database and represents the person who will fill out the form.

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `vendor.id` | string | Unique vendor identifier | `"vendor-123"` | Auto-generated UUID |
| `vendor.name` | string | Vendor's full name | `"John Smith"` | Required field |
| `vendor.email` | string | Vendor's email address | `"john@example.com"` | May be null |
| `vendor.phone` | string | Vendor's phone number | `"+64 21 123 4567"` | May be null |
| `vendor.meta.*` | any | Custom vendor fields | `"Custom Value"` | Access nested JSON properties |
| `vendor.createdAt` | string | When vendor was created | `"2024-01-15T10:30:00Z"` | ISO timestamp |
| `vendor.updatedAt` | string | When vendor was last updated | `"2024-01-20T14:45:00Z"` | ISO timestamp |

### Vendor Meta Fields

The `vendor.meta` field is a JSON object that can contain custom vendor information. Access nested properties using dot notation:

```markdown
### Preferred Contact Time
- field: contactTime
- chip: vendor.meta.preferredContactTime

### Company Name
- field: company
- chip: vendor.meta.companyName
```

---

## Campaign Data Chips

Campaign data represents the property project or campaign that the form is associated with.

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `campaign.id` | string | Unique campaign identifier | `"campaign-456"` | Auto-generated UUID |
| `campaign.name` | string | Campaign name | `"Spring 2024 Campaign"` | Required field |
| `campaign.status` | string | Campaign status | `"active"` | draft, active, archived |
| `campaign.startDate` | string | Campaign start date | `"2024-03-01T00:00:00Z"` | May be null |
| `campaign.endDate` | string | Campaign end date | `"2024-06-30T23:59:59Z"` | May be null |
| `campaign.listingId` | number | Cooper API listing ID | `12345` | May be null if manual address |
| `campaign.manualAddress` | string | Manual property address | `"123 Main Street, Auckland"` | Used when no API listing |
| `campaign.createdAt` | string | When campaign was created | `"2024-01-15T10:30:00Z"` | ISO timestamp |
| `campaign.updatedAt` | string | When campaign was last updated | `"2024-01-20T14:45:00Z"` | ISO timestamp |

---

## Listing Data Chips (Cooper API)

Listing data comes from the Cooper & Co API and provides detailed property information. This data is only available when a campaign is linked to a Cooper API listing.

### Core Identifiers

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.id` | number | Cooper API listing ID | `12345` | Primary identifier |
| `listing.vaultId` | number | Vault system ID | `20718857` | Internal Cooper ID |
| `listing.lifeId` | number | Life system ID | `24235966` | Internal Cooper ID |

### Property Details

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.bedrooms` | number | Number of bedrooms | `3` | May be null |
| `listing.bathrooms` | number | Number of bathrooms | `2` | May be null |
| `listing.toilets` | number | Number of toilets | `3` | May be null |
| `listing.carSpacesGarage` | number | Garage spaces | `2` | May be null |
| `listing.carSpacesCarport` | number | Carport spaces | `1` | May be null |
| `listing.landArea` | number | Land area in square meters | `800` | May be null |
| `listing.floorArea` | number | Floor area in square meters | `180` | May be null |
| `listing.rent` | number | Weekly rent amount | `650` | May be null |

### Pricing Information

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.searchPrice` | number | Asking/search price | `850000` | May be null |
| `listing.salePrice` | number | Final sale price | `920000` | May be null |
| `listing.internetPrice` | string | Formatted price display | `"$850,000"` | Always string |

### Property Information

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.propertyTypeName` | string | Property type | `"House"` | House, Apartment, etc. |
| `listing.internetHeading` | string | Property title | `"Modern Family Home"` | Marketing headline |
| `listing.internetBody` | string | Property description | `"Beautiful 3 bedroom..."` | May be null |
| `listing.displayAddress` | string | Full property address | `"123 Main Street, Auckland"` | |
| `listing.displayListingNumber` | string | Listing reference | `"ABC123"` | |
| `listing.type` | string | Listing type | `"residentialSale"` | residentialSale, ruralSale |
| `listing.status` | string | Listing status | `"available"` | available, underOffer, sold |

### Dates

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.listingDate` | string | When property was listed | `"2024-01-15T00:00:00Z"` | ISO timestamp |
| `listing.soldDate` | string | When property was sold | `"2024-02-20T00:00:00Z"` | May be null |

### Location

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.latLng.lat` | number | Latitude coordinate | `-36.8485` | May be null |
| `listing.latLng.lng` | number | Longitude coordinate | `174.7633` | May be null |

### Media

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.primaryPhotoUrl` | string | Main property photo | `"https://cooperco-v2-prod.imgix.net/..."` | |
| `listing.tpsUrl` | string | TPS tour URL | `"https://example.com/tour"` | May be null |

### Branch/Office Information

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.branch.id` | number | Branch ID | `1` | |
| `listing.branch.name` | string | Branch name | `"Harcourts Auckland"` | |
| `listing.branch.code` | string | Branch code | `"AKL"` | |
| `listing.branch.businessPhone` | string | Branch phone | `"09 123 4567"` | May be null |
| `listing.branch.emailAddress` | string | Branch email | `"info@harcourts.co.nz"` | |
| `listing.branch.webAddress` | string | Branch website | `"https://harcourts.co.nz"` | May be null |
| `listing.branch.branchType` | string | Branch type | `"residential"` | |

### Agent Information

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.users[0].id` | number | Primary agent ID | `1` | First agent in array |
| `listing.users[0].name` | string | Agent full name | `"John Smith"` | |
| `listing.users[0].firstName` | string | Agent first name | `"John"` | |
| `listing.users[0].lastName` | string | Agent last name | `"Smith"` | |
| `listing.users[0].businessPhone` | string | Agent business phone | `"09 123 4567"` | May be null |
| `listing.users[0].mobilePhone` | string | Agent mobile phone | `"021 123 456"` | May be null |
| `listing.users[0].emailAddress` | string | Agent email | `"john.smith@harcourts.co.nz"` | |
| `listing.users[0].position` | string | Agent position | `"Sales Consultant"` | |
| `listing.users[0].photoUrl` | string | Agent photo | `"https://cooperco-v2-prod.imgix.net/..."` | |

### Tours

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.tours.virtualTourUrl` | string | Virtual tour URL | `"https://example.com/virtual-tour"` | May be null |
| `listing.tours.videoTourUrl` | string | Video tour URL | `"https://example.com/video-tour"` | May be null |

### Optional Fields

| Chip Reference | Type | Description | Example Value | Notes |
|----------------|------|-------------|---------------|-------|
| `listing.internalRemarks` | string | Internal agent notes | `"Great potential..."` | May be null |
| `listing.auctionLocation` | string | Auction venue | `"Auckland Convention Centre"` | May be null |
| `listing.auctionDateTime` | string | Auction date/time | `"2024-03-15T14:00:00Z"` | May be null |
| `listing.tenderDateTime` | string | Tender deadline | `"2024-03-20T17:00:00Z"` | May be null |
| `listing.deadlineTreatyDateTime` | string | Treaty deadline | `"2024-03-25T17:00:00Z"` | May be null |

---

## Usage Examples

### Basic Vendor Information Form

```markdown
# Vendor Information Form

## Personal Details

### Full Name
- field: fullName
- required: true
- chip: vendor.name

### Email Address
- field: email
- type: email
- required: true
- chip: vendor.email

### Phone Number
- field: phone
- required: false
- chip: vendor.phone
```

### Property Inquiry Form

```markdown
# Property Inquiry Form

## Property Details

### Property Address
- field: address
- type: textarea
- chip: listing.displayAddress

### Listed Price
- field: listedPrice
- type: currency
- chip: listing.salePrice

### Property Type
- field: propertyType
- chip: listing.propertyTypeName

### Bedrooms
- field: bedrooms
- type: number
- chip: listing.bedrooms

### Bathrooms
- field: bathrooms
- type: number
- chip: listing.bathrooms
```

### Campaign-Specific Form

```markdown
# Campaign Feedback Form

## Campaign Information

### Campaign Name
- field: campaignName
- chip: campaign.name

### Campaign Status
- field: status
- chip: campaign.status

### Property Address
- field: address
- chip: campaign.manualAddress
```

### Agent Contact Form

```markdown
# Contact Agent

## Agent Information

### Agent Name
- field: agentName
- chip: listing.users[0].name

### Agent Email
- field: agentEmail
- type: email
- chip: listing.users[0].emailAddress

### Agent Phone
- field: agentPhone
- chip: listing.users[0].mobilePhone

### Branch Name
- field: branchName
- chip: listing.branch.name
```

---

## Best Practices

### 1. Handle Null Values

Many fields may be null, especially in listing data. Consider providing fallbacks:

```markdown
### Property Price
- field: price
- type: currency
- chip: listing.salePrice
- placeholder: "Price not available"
```

### 2. Use Appropriate Field Types

Match the chip data type to the form field type:

```markdown
### Email Address
- field: email
- type: email
- chip: vendor.email

### Phone Number
- field: phone
- type: text
- chip: vendor.phone

### Price
- field: price
- type: currency
- chip: listing.salePrice
```

### 3. Nested Object Access

For complex objects like agent information, use array notation:

```markdown
### Primary Agent
- field: agentName
- chip: listing.users[0].name
```

### 4. Custom Meta Fields

Access custom vendor fields through the meta object:

```markdown
### Company Name
- field: company
- chip: vendor.meta.companyName

### Preferred Contact Method
- field: contactMethod
- chip: vendor.meta.preferredContactMethod
```

### 5. Conditional Fields

Use chips in conditional logic to show/hide fields based on data:

```markdown
- if: listing.status == "sold"
  - label: "Sale Price"
  - field: salePrice
  - chip: listing.salePrice
```

---

## Troubleshooting

### Common Issues

1. **Chip not resolving**: Check that the campaign is linked to a Cooper API listing
2. **Null values**: Many listing fields can be null - provide appropriate placeholders
3. **Nested access**: Use dot notation for nested objects (e.g., `listing.branch.name`)
4. **Array access**: Use `[0]` for first element in arrays (e.g., `listing.users[0].name`)

### Debugging Tips

- Test templates with sample data to verify chip resolution
- Check that campaigns have valid `listingId` for Cooper API data
- Verify vendor and campaign data exists in the database
- Use the template editor preview to see resolved values

---

## Related Documentation

- [Template System Guide](TEMPLATE_SYSTEM.md) - Complete template syntax and features
- [API Integration Guide](api_guide.md) - Cooper & Co API documentation
- [Database Schema](shared/schema.ts) - Application database structure

---

*This guide covers all available chip references as of the current template system version. For the most up-to-date information, refer to the source code in `shared/template-parser.ts` and `server/template-processor.ts`.*





