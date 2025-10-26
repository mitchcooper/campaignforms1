# Cooper & Co API Integration Guide

## Overview

This guide provides comprehensive documentation for integrating with the Cooper & Co real estate API (`api.cooperandco.co.nz`). Based on analysis of a production application, this guide covers authentication, endpoints, data structures, and best practices for rapid deployment.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Core Endpoints](#core-endpoints)
4. [Data Structures](#data-structures)
5. [Query Parameters](#query-parameters)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)
8. [Rate Limiting & Caching](#rate-limiting--caching)
9. [Implementation Examples](#implementation-examples)
10. [Best Practices](#best-practices)

## Authentication

### OAuth 2.0 Password Grant Flow

The Cooper API uses OAuth 2.0 with password grant type for authentication.

**Authentication Endpoint:**
```
POST https://auth.cooperandco.co.nz/connect/token
```

**Request Format:**
```http
Content-Type: application/x-www-form-urlencoded

client_id=intranet
scope=openid api.intranet
grant_type=password
username=YOUR_USERNAME
password=YOUR_PASSWORD
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "api.intranet openid",
  "refresh_token": "refresh_token_here"
}
```

### Token Management

- **Token Type:** Bearer tokens
- **Expiration:** 1 hour (3600 seconds)
- **Refresh:** Use refresh_token to obtain new access_token
- **Storage:** Store tokens securely with expiration tracking

**Implementation Example:**
```typescript
interface AuthToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expiresAt: number; // Calculated: Date.now() + (expires_in * 1000)
}

class CooperAuthClient {
  async authenticate(username: string, password: string): Promise<AuthToken> {
    const formData = new URLSearchParams({
      client_id: "intranet",
      scope: "openid api.intranet",
      grant_type: "password",
      username,
      password,
    });

    const response = await fetch("https://auth.cooperandco.co.nz/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const tokenData = await response.json();
    return {
      ...tokenData,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };
  }
}
```

## Base URLs

- **API Base:** `https://api.cooperandco.co.nz`
- **Auth Base:** `https://auth.cooperandco.co.nz`

## Core Endpoints

### 1. Property Listings

**Endpoint:** `GET /Listings`

**Purpose:** Retrieve property listings with filtering and pagination

**Query Parameters:**
- `isPublished=true` (required)
- `count` (1-1000, default: 100)
- `expand` (comma-separated: users,branch,listingPhotos,listingOpenHomes)
- `orderBy=Latest`
- `usePaging=true`
- `listingTypes` (residentialSale, ruralSale)
- `listingStatuses` (available, underOffer, sold)
- `listingBranchId` (office/branch ID)
- `includeSearchPrice=true`
- `includeSalePrice=true`
- `includeInternalRemarks=true`
- `soldDateFrom` (ISO date string for sold properties)
- `cursor` (for pagination)

**Example Request:**
```http
GET https://api.cooperandco.co.nz/Listings?isPublished=true&count=100&expand=users,branch,listingPhotos&orderBy=Latest&usePaging=true&listingTypes=residentialSale&listingStatuses=available&includeSearchPrice=true&includeSalePrice=true&includeInternalRemarks=true&searchText=3 bedroom house
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 2. Property Details

**Endpoint:** `GET /Listings/{propertyId}`

**Purpose:** Get detailed information for a specific property

**Query Parameters:**
- `expand=users,branch,listingPhotos,listingOpenHomes`
- `includeSearchPrice=true`
- `includeSalePrice=true`
- `includeInternalRemarks=true`

**Example Request:**
```http
GET https://api.cooperandco.co.nz/Listings/12345?expand=users,branch,listingPhotos,listingOpenHomes&includeSearchPrice=true&includeSalePrice=true&includeInternalRemarks=true
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 3. Branches/Offices

**Endpoint:** `GET /branches`

**Purpose:** Get list of Cooper & Co branches/offices

**Example Request:**
```http
GET https://api.cooperandco.co.nz/branches
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Data Structures

### Property Object

```typescript
interface Property {
  // Core identifiers
  id: number;
  vaultId: number;
  lifeId: number;
  
  // Property details
  bedrooms: number | null;
  carSpacesGarage: number | null;
  carSpacesCarport: number | null;
  bathrooms: number | null;
  toilets: number | null;
  rent: number | null;
  landArea: number | null;
  floorArea: number | null;
  
  // Pricing
  searchPrice: number | null;
  salePrice: number | null;
  internetPrice: string;
  
  // Property information
  propertyTypeName: string;
  internetHeading: string;
  listingDate: string;
  soldDate: string | null;
  displayAddress: string;
  displayListingNumber: string;
  type: string;
  status: string;
  
  // Location
  latLng: {
    lat: number;
    lng: number;
  } | null;
  address: any | null;
  
  // Branch/Office
  branch: {
    id: number;
    name: string;
    code: string;
    businessPhone: string | null;
    emailAddress: string;
    webAddress: string | null;
    branchType: string;
    address?: any;
    socialMediaLinks?: any;
  };
  
  // Media
  primaryPhotoUrl: string;
  listingPhotos?: Array<{
    id: number;
    url: string;
    caption?: string;
    orderIndex: number;
    isFloorPlan: boolean;
  }>;
  
  // Tours
  tours: {
    virtualTourUrl: string | null;
    videoTourUrl: string | null;
  } | null;
  
  // Agents
  users: Array<{
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    businessPhone: string | null;
    mobilePhone: string | null;
    emailAddress: string;
    position: string;
    photoUrl: string;
    branchId?: number;
    securityGroup?: string;
    biography?: string;
    branchType?: string;
    displayAsManagement?: boolean;
    displayAsPropertyManagement?: boolean;
    displayAsSaleConsultant?: boolean;
    displayAsStaff?: boolean;
  }>;
  
  // Optional fields
  tpsUrl?: string | null;
  internalRemarks?: string | null;
  internetBody?: string | null;
  auctionLocation?: string | null;
  tenderDateTime?: string | null;
  deadlineTreatyDateTime?: string | null;
  auctionDateTime?: string | null;
  listingFeatures?: any;
  listingOpenHomes?: Array<{
    id: number;
    startsAt: string;
    endsAt: string;
  }>;
  listingFrontLinks?: any;
}
```

### API Response Structure

**Listings Response:**
```typescript
interface ListingsResponse {
  items: Property[];
  count: number;
  isPaging: boolean;
  cursor?: string;
  nextCursor?: string | null;
  hasMore?: boolean;
  totalItems?: number;
  breakdown?: {
    sold: number;
    underOffer: number;
    active: number;
  };
}
```

## Query Parameters

### Filtering Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `listingStatuses` | string[] | Property statuses | `["available", "underOffer", "sold"]` |
| `listingTypes` | string[] | Property types | `["residentialSale", "ruralSale"]` |
| `listingBranchId` | number[] | Office/branch IDs | `[1, 2, 3]` |
| `soldDateFrom` | string | ISO date for sold properties | `"2024-01-01T00:00:00.000Z"` |
| `searchText` | string | Text search across property fields | `"3 bedroom house"` |

### Pagination Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `count` | number | Items per page (1-1000) | 100 |
| `cursor` | string | Pagination cursor | null |
| `usePaging` | boolean | Enable pagination | true |

### Expansion Parameters

| Parameter | Description | Fields Included |
|-----------|-------------|-----------------|
| `users` | Agent information | `users` array |
| `branch` | Office/branch details | `branch` object |
| `listingPhotos` | Property photos | `listingPhotos` array |
| `listingOpenHomes` | Open home times | `listingOpenHomes` array |

### Data Inclusion Parameters

| Parameter | Description |
|-----------|-------------|
| `includeSearchPrice` | Include search/asking price |
| `includeSalePrice` | Include sale price (for sold properties) |
| `includeInternalRemarks` | Include internal agent remarks |

### Text Search Parameters

| Parameter | Type | Description | Search Fields |
|-----------|------|-------------|---------------|
| `searchText` | string | Full-text search query | Address, heading, remarks, agent names |
| `search` | string | Alternative search parameter | Same as searchText |

## Response Formats

### Success Response

```json
{
  "items": [
    {
      "id": 12345,
      "vaultId": 20718857,
      "lifeId": 24235966,
      "bedrooms": 3,
      "bathrooms": 2,
      "searchPrice": 850000,
      "salePrice": 920000,
      "propertyTypeName": "House",
      "internetHeading": "Modern Family Home",
      "internetPrice": "$850,000",
      "listingDate": "2024-01-15T00:00:00+00:00",
      "soldDate": "2024-02-20T00:00:00+00:00",
      "displayAddress": "123 Main Street, Auckland",
      "displayListingNumber": "ABC123",
      "type": "residentialSale",
      "status": "sold",
      "latLng": {
        "lat": -36.8485,
        "lng": 174.7633
      },
      "branch": {
        "id": 1,
        "name": "Harcourts Auckland",
        "code": "AKL",
        "businessPhone": "09 123 4567",
        "emailAddress": "info@harcourts.co.nz",
        "webAddress": "https://harcourts.co.nz",
        "branchType": "residential"
      },
      "primaryPhotoUrl": "https://cooperco-v2-prod.imgix.net/vault-images/...",
      "users": [
        {
          "id": 1,
          "name": "John Smith",
          "firstName": "John",
          "lastName": "Smith",
          "businessPhone": "09 123 4567",
          "mobilePhone": "021 123 456",
          "emailAddress": "john.smith@harcourts.co.nz",
          "position": "Sales Consultant",
          "photoUrl": "https://cooperco-v2-prod.imgix.net/vault-images/..."
        }
      ],
      "tours": {
        "virtualTourUrl": "https://example.com/virtual-tour",
        "videoTourUrl": null
      }
    }
  ],
  "count": 1,
  "isPaging": true,
  "cursor": "next_page_cursor",
  "nextCursor": "next_page_cursor",
  "hasMore": true
}
```

### Error Response

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials"
}
```

## Error Handling

### HTTP Status Codes

| Code | Description | Action |
|------|-------------|--------|
| 200 | Success | Process response |
| 401 | Unauthorized | Refresh token or re-authenticate |
| 404 | Not Found | Property/endpoint doesn't exist |
| 429 | Rate Limited | Implement backoff strategy |
| 500 | Server Error | Retry with exponential backoff |

### Error Handling Implementation

```typescript
class CooperAPIClient {
  async fetchJson<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error("Authentication failed - please re-authenticate");
        case 404:
          throw new Error("Resource not found");
        case 429:
          throw new Error("Rate limited - please retry later");
        default:
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }

    return response.json() as Promise<T>;
  }
}
```

## Rate Limiting & Caching

### Recommended Caching Strategy

```typescript
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
  staleTtl: number; // Stale-while-revalidate period
}

const CACHE_CONFIG: CacheConfig = {
  ttl: 2 * 60 * 1000, // 2 minutes fresh
  maxSize: 200, // 200 entries
  staleTtl: 10 * 60 * 1000, // 10 minutes stale
};
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 60000) { // 1 minute
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

## Implementation Examples

### Complete Client Implementation

```typescript
interface CooperAPIConfig {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  scope: string;
}

class CooperAPIClient {
  private config: CooperAPIConfig;
  private token: AuthToken | null = null;
  private circuitBreaker = new CircuitBreaker();

  constructor(config: CooperAPIConfig) {
    this.config = config;
  }

  async authenticate(username: string, password: string): Promise<void> {
    const formData = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scope,
      grant_type: "password",
      username,
      password,
    });

    const response = await fetch(`${this.config.authUrl}/connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.token = {
      ...tokenData,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };
  }

  async getProperties(params: PropertySearchParams): Promise<ListingsResponse> {
    return this.circuitBreaker.execute(async () => {
      const token = await this.getValidToken();
      const url = this.buildListingsUrl(params);
      return this.fetchJson<ListingsResponse>(url, token);
    });
  }

  async getProperty(propertyId: number): Promise<Property> {
    return this.circuitBreaker.execute(async () => {
      const token = await this.getValidToken();
      const url = `${this.config.baseUrl}/Listings/${propertyId}?${this.buildPropertyDetailsParams()}`;
      return this.fetchJson<Property>(url, token);
    });
  }

  async getBranches(): Promise<Branch[]> {
    return this.circuitBreaker.execute(async () => {
      const token = await this.getValidToken();
      const url = `${this.config.baseUrl}/branches`;
      return this.fetchJson<Branch[]>(url, token);
    });
  }

  private async getValidToken(): Promise<string> {
    if (!this.token || Date.now() >= this.token.expiresAt) {
      throw new Error("No valid token available - please authenticate");
    }
    return this.token.access_token;
  }

  private buildListingsUrl(params: PropertySearchParams): string {
    const searchParams = new URLSearchParams({
      isPublished: "true",
      count: Math.min(params.count, 1000).toString(),
      expand: "users,branch,listingPhotos",
      orderBy: "Latest",
      usePaging: "true",
      includeSearchPrice: "true",
      includeSalePrice: "true",
      includeInternalRemarks: "true",
    });

    if (params.cursor) searchParams.append("cursor", params.cursor);
    if (params.statuses) params.statuses.forEach(s => searchParams.append("listingStatuses", s));
    if (params.officeIds) params.officeIds.forEach(id => searchParams.append("listingBranchId", id.toString()));
    if (params.searchText) searchParams.append("searchText", params.searchText);

    return `${this.config.baseUrl}/Listings?${searchParams.toString()}`;
  }

  private buildPropertyDetailsParams(): string {
    return new URLSearchParams({
      expand: "users,branch,listingPhotos,listingOpenHomes",
      includeSearchPrice: "true",
      includeSalePrice: "true",
      includeInternalRemarks: "true",
    }).toString();
  }

  private async fetchJson<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Cooper API ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
```

### Usage Example

```typescript
// Initialize client
const client = new CooperAPIClient({
  baseUrl: "https://api.cooperandco.co.nz",
  authUrl: "https://auth.cooperandco.co.nz",
  clientId: "intranet",
  scope: "openid api.intranet",
});

// Authenticate
await client.authenticate("your_username", "your_password");

// Get properties
const properties = await client.getProperties({
  count: 100,
  statuses: ["available", "underOffer"],
  officeIds: [1, 2, 3],
  searchText: "3 bedroom house",
});

// Get specific property
const property = await client.getProperty(12345);

// Get branches
const branches = await client.getBranches();
```

## Text Search Implementation

### Search Functionality

The Cooper API supports full-text search across multiple property fields:

**Search Fields:**
- Property address (`displayAddress`)
- Property heading (`internetHeading`)
- Property description (`internetBody`)
- Internal remarks (`internalRemarks`)
- Agent names (`users.name`)

**Search Implementation:**

```typescript
// Basic text search
const searchResults = await client.getProperties({
  count: 100,
  searchText: "3 bedroom house",
  statuses: ["available", "underOffer"],
});

// Advanced search with multiple criteria
const advancedSearch = await client.getProperties({
  count: 100,
  searchText: "modern kitchen",
  statuses: ["available"],
  officeIds: [1, 2],
  daysBack: 30,
});
```

**Search Query Examples:**

| Query | Matches |
|-------|---------|
| `"3 bedroom"` | Properties with "3 bedroom" in address/heading |
| `"modern kitchen"` | Properties mentioning "modern kitchen" |
| `"John Smith"` | Properties with agent named "John Smith" |
| `"Auckland"` | Properties in Auckland addresses |
| `"auction"` | Properties with auction-related content |

**Enhanced Search Strategy:**

The application implements a two-tier search approach:

1. **Cache Search**: First searches locally cached properties for instant results
2. **API Search**: Falls back to direct Cooper API search for comprehensive results
3. **Deduplication**: Combines and deduplicates results from both sources

```typescript
// Enhanced search implementation
class EnhancedSearchClient {
  async searchProperties(params: {
    searchText: string;
    statuses?: string[];
    officeIds?: number[];
  }) {
    // 1. Search cached properties first (fast)
    const cacheResults = await this.searchCache(params);
    
    // 2. Search Cooper API directly (comprehensive)
    const apiResults = await this.searchAPI(params);
    
    // 3. Combine and deduplicate
    return this.combineResults(cacheResults, apiResults);
  }
}
```

## Best Practices

### 1. Token Management
- Store tokens securely with encryption
- Implement automatic token refresh
- Handle token expiration gracefully
- Use in-memory caching for active tokens

### 2. Error Handling
- Implement exponential backoff for retries
- Use circuit breaker pattern for API failures
- Log errors for monitoring and debugging
- Provide meaningful error messages to users

### 3. Performance Optimization
- Implement intelligent caching (LRU with TTL)
- Use stale-while-revalidate strategy
- Batch requests when possible
- Implement request deduplication

### 4. Rate Limiting
- Respect API rate limits
- Implement client-side rate limiting
- Use exponential backoff for 429 responses
- Monitor API usage patterns

### 5. Data Transformation
- Transform API responses to your application's data model
- Handle null/undefined values gracefully
- Implement data validation
- Optimize image URLs (use Imgix or similar)

### 6. Monitoring & Logging
- Log API requests and responses
- Monitor response times and error rates
- Track cache hit rates
- Set up alerts for API failures

### 7. Security
- Never log sensitive data (passwords, tokens)
- Use HTTPS for all API communications
- Implement proper token storage
- Validate all input parameters

## Environment Variables

```bash
# Required environment variables
COOPER_API_BASE_URL=https://api.cooperandco.co.nz
COOPER_AUTH_URL=https://auth.cooperandco.co.nz
COOPER_CLIENT_ID=intranet
COOPER_SCOPE=openid api.intranet

# Optional configuration
COOPER_CACHE_TTL=120000  # 2 minutes in milliseconds
COOPER_CACHE_SIZE=200    # Maximum cache entries
COOPER_RATE_LIMIT=100    # Requests per minute
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check credentials
   - Verify token hasn't expired
   - Ensure proper token format (Bearer prefix)

2. **404 Not Found**
   - Verify property ID exists
   - Check endpoint URL
   - Ensure property is published

3. **429 Rate Limited**
   - Implement backoff strategy
   - Reduce request frequency
   - Use caching to minimize API calls

4. **500 Server Error**
   - Retry with exponential backoff
   - Check API status
   - Contact Cooper & Co support

### Debug Tips

- Enable request/response logging
- Use API testing tools (Postman, curl)
- Monitor network traffic
- Check token expiration times
- Validate query parameters

## Support & Resources

- **API Documentation:** Contact Cooper & Co for official documentation
- **Support:** Reach out to Cooper & Co technical support
- **Status Page:** Monitor API availability
- **Community:** Join developer forums if available

---

*This guide is based on analysis of a production application using the Cooper & Co API. For the most up-to-date information, please refer to official Cooper & Co documentation.*
