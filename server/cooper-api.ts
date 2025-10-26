// Cooper & Co API Integration
// Based on api_guide.md specifications

interface AuthToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expiresAt: number; // Calculated: Date.now() + (expires_in * 1000)
}

interface Property {
  id: number;
  vaultId: number;
  lifeId: number;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpacesGarage: number | null;
  carSpacesCarport: number | null;
  landArea: number | null;
  floorArea: number | null;
  searchPrice: number | null;
  salePrice: number | null;
  propertyTypeName: string;
  internetHeading: string;
  internetPrice: string;
  listingDate: string;
  soldDate: string | null;
  displayAddress: string;
  displayListingNumber: string;
  type: string;
  status: string;
  latLng: { lat: number; lng: number } | null;
  branch: Branch;
  primaryPhotoUrl: string;
  users: User[];
  tours: { virtualTourUrl: string | null; videoTourUrl: string | null } | null;
  listingPhotos?: ListingPhoto[];
  listingOpenHomes?: ListingOpenHome[];
  internalRemarks?: string;
  auctionDateTime?: string | null;
  tenderDateTime?: string | null;
  deadlineTreatyDateTime?: string | null;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  businessPhone: string | null;
  emailAddress: string;
  webAddress: string | null;
  branchType: string;
}

interface User {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  businessPhone: string | null;
  mobilePhone: string | null;
  emailAddress: string;
  position: string;
  photoUrl: string;
}

interface ListingPhoto {
  width: number;
  height: number;
  orderIndex: number;
  description: string;
  isFloorPlan: boolean;
  photoUrl: string;
}

interface ListingOpenHome {
  id: number;
  startsAt: string;
  endsAt: string;
}

interface PropertySearchResponse {
  items: Property[];
  count: number;
  nextCursor?: string;
  hasMore: boolean;
}

class TokenManager {
  private token: AuthToken | null = null;
  private refreshPromise: Promise<AuthToken> | null = null;

  async getValidToken(): Promise<string> {
    if (!this.token || this.isTokenExpired()) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.authenticate();
      }
      this.token = await this.refreshPromise;
      this.refreshPromise = null;
    }
    return this.token.access_token;
  }

  private isTokenExpired(): boolean {
    return !this.token || Date.now() >= this.token.expiresAt - 60000; // 1 minute buffer
  }

  private async authenticate(): Promise<AuthToken> {
    const username = process.env.COOPER_API_USERNAME;
    const password = process.env.COOPER_API_PASSWORD;

    if (!username || !password) {
      throw new Error("COOPER_API_USERNAME and COOPER_API_PASSWORD must be set");
    }

    const formData = new URLSearchParams({
      client_id: "intranet",
      scope: "openid api.intranet",
      grant_type: "password",
      username,
      password,
    });

    const authUrl = process.env.COOPER_AUTH_URL || "https://auth.cooperandco.co.nz/connect/token";

    const response = await fetch(authUrl, {
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
    return {
      ...tokenData,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };
  }
}

class RequestDeduplicator<T> {
  private pendingRequests = new Map<string, Promise<T>>();

  async deduplicate(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

class RetryableAPIClient {
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
}

export class CooperAPIClient {
  private baseUrl: string;
  private tokenManager: TokenManager;
  private deduplicator: RequestDeduplicator<any>;
  private retryClient: RetryableAPIClient;

  constructor() {
    this.baseUrl = process.env.COOPER_API_URL || "https://api.cooperandco.co.nz";
    this.tokenManager = new TokenManager();
    this.deduplicator = new RequestDeduplicator();
    this.retryClient = new RetryableAPIClient();
  }

  async searchProperties(params: {
    count?: number;
    statuses?: string[];
    officeIds?: string[];
    expand?: string;
    cursor?: string;
    soldDateFrom?: string;
    searchText?: string;
    listingTypes?: string[];
  }): Promise<PropertySearchResponse> {
    const searchParams = new URLSearchParams({
      isPublished: 'true',
      count: (params.count || 100).toString(),
      expand: params.expand || 'users,branch,listingPhotos',
      orderBy: 'latest',
      usePaging: 'true',
      includeSearchPrice: 'true',
      includeSalePrice: 'true',
      includeInternalRemarks: 'true',
    });

    if (params.cursor) {
      searchParams.append('cursor', params.cursor);
    }

    if (params.soldDateFrom) {
      searchParams.append('soldDateFrom', params.soldDateFrom);
    } else {
      // Add default soldDateFrom to match working example
      searchParams.append('soldDateFrom', '2020-09-30T11:00:00.000Z');
    }

    if (params.searchText) {
      searchParams.append('searchText', params.searchText);
    }

    // Add listing types
    if (params.listingTypes?.length) {
      params.listingTypes.forEach(type => {
        searchParams.append('listingTypes', type);
      });
    } else {
      ['residentialSale', 'ruralSale'].forEach(type => {
        searchParams.append('listingTypes', type);
      });
    }

    // Add statuses
    (params.statuses || ['available', 'underOffer', 'sold']).forEach(status => {
      searchParams.append('listingStatuses', status);
    });

    // Add office filters
    if (params.officeIds?.length) {
      params.officeIds.forEach(id => {
        searchParams.append('listingBranchId', id);
      });
    }

    const response = await this.makeRequest<any>(`/listings?${searchParams.toString()}`);
    
    // Transform to expected format
    return {
      items: (response.items || []).map((item: any) => ({
        ...item,
        id: item.lifeId || item.vaultId || item.id, // Use lifeId as the primary ID
      })),
      count: response.items?.length || 0,
      nextCursor: response.nextCursor,
      hasMore: !!response.nextCursor,
    };
  }

  async getPropertyDetails(propertyId: number): Promise<Property> {
    const params = new URLSearchParams({
      expand: 'users,branch,listingPhotos,listingOpenHomes',
      includeSearchPrice: 'true',
      includeSalePrice: 'true',
      includeInternalRemarks: 'true',
    });

    return this.makeRequest(`/Listings/${propertyId}?${params.toString()}`);
  }

  async getBranches(): Promise<Branch[]> {
    return this.makeRequest('/branches');
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const cacheKey = `cooper-api-${endpoint}`;
    
    return this.deduplicator.deduplicate(cacheKey, async () => {
      return this.retryClient.withRetry(async () => {
        const token = await this.tokenManager.getValidToken();

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired, clear cache and retry
            this.tokenManager = new TokenManager();
            const newToken = await this.tokenManager.getValidToken();
            
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Accept': 'application/json',
              },
            });
            
            if (!retryResponse.ok) {
              throw new Error(`API request failed: ${retryResponse.status}`);
            }
            
            return retryResponse.json();
          }
          throw new Error(`API request failed: ${response.status}`);
        }

        return response.json();
      });
    });
  }
}

// Singleton instance
export const cooperAPI = new CooperAPIClient();

// Export types for use in other modules
export type { Property, Branch, User, ListingPhoto, ListingOpenHome, PropertySearchResponse };
