import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Calendar, DollarSign, Building, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Property {
  id: number;
  displayAddress: string;
  internetHeading: string;
  internetPrice: string;
  propertyTypeName: string;
  status: string;
  primaryPhotoUrl: string;
  listingDate: string;
  listingOpenHomes?: Array<{
    startsAt: string;
    endsAt: string;
  }>;
  branch?: {
    name: string;
  };
}

interface PropertySearchResponse {
  items: Property[];
  count: number;
  nextCursor?: string;
  hasMore: boolean;
}

interface CooperListingDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectListing: (listingId: number, listingData: Property) => void;
}

export function CooperListingDialog({ open, onClose, onSelectListing }: CooperListingDialogProps) {
  const { toast } = useToast();
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Fetch branches for office filter
  const { data: branches } = useQuery({
    queryKey: ["/api/cooper/branches"],
    enabled: open,
  });

  // Search properties
  const { data: searchResults, isLoading: isSearching } = useQuery<PropertySearchResponse>({
    queryKey: ["/api/cooper/listings/search", searchText, selectedStatus, selectedOffice],
    queryFn: async () => {
      const params = new URLSearchParams({
        count: "20",
        expand: "users,branch,listingPhotos,listingOpenHomes",
        isPublished: "true",
        orderBy: "Latest",
        usePaging: "true",
        includeSearchPrice: "true",
        includeSalePrice: "true",
        includeInternalRemarks: "true",
      });

      // Add search text if provided
      if (searchText.trim()) {
        params.append("searchText", searchText.trim());
      }

      // Add listing types
      params.append("listingTypes", "residentialSale");
      params.append("listingTypes", "ruralSale");

      // Add statuses
      if (selectedStatus !== "all") {
        params.append("listingStatuses", selectedStatus);
      } else {
        params.append("listingStatuses", "available");
        params.append("listingStatuses", "underOffer");
        params.append("listingStatuses", "sold");
      }

      // Add office filter
      if (selectedOffice !== "all") {
        params.append("listingBranchId", selectedOffice);
      }

      return apiRequest("GET", `/api/cooper/listings/search?${params.toString()}`);
    },
    enabled: open,
  });

  const handleSearch = () => {
    // Trigger search by invalidating the query
    queryClient.invalidateQueries({ queryKey: ["/api/cooper/listings/search", searchText, selectedStatus, selectedOffice] });
  };

  // Auto-search when filters change (with debounce for search text)
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, searchText ? 500 : 0); // 500ms debounce for search text, immediate for filters
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchText, selectedStatus, selectedOffice, open]);

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleConfirmSelection = () => {
    if (selectedProperty) {
      onSelectListing(selectedProperty.id, selectedProperty);
    }
  };

  const handleClose = () => {
    setSearchText("");
    setSelectedStatus("all");
    setSelectedOffice("all");
    setSelectedProperty(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Cooper & Co Property</DialogTitle>
          <DialogDescription>
            Search and select a property from Cooper & Co listings to link to this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search Controls */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search Properties</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by address, heading, or listing number..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="underOffer">Under Offer</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Office</label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {branches?.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-hidden">
            {isSearching ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults?.items?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-96">
                {searchResults.items.map((property) => (
                  <Card 
                    key={property.id}
                    className={`cursor-pointer transition-colors ${
                      selectedProperty?.id === property.id 
                        ? 'ring-2 ring-cyan-500 bg-cyan-50' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectProperty(property)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {property.primaryPhotoUrl && (
                          <img 
                            src={property.primaryPhotoUrl} 
                            alt={property.internetHeading}
                            className="w-full h-32 object-cover rounded"
                          />
                        )}
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm line-clamp-2">
                            {property.internetHeading}
                          </h3>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{property.displayAddress}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>{property.internetPrice}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span>{property.propertyTypeName}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                              {property.status}
                            </Badge>
                            
                            {property.branch && (
                              <span className="text-xs text-muted-foreground">
                                {property.branch.name}
                              </span>
                            )}
                          </div>
                          
                          {property.listingOpenHomes && property.listingOpenHomes.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(new Date(property.listingOpenHomes[0].startsAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No properties found. Try adjusting your search criteria.</p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Property Preview */}
          {selectedProperty && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Selected Property</h4>
              <div className="bg-muted/50 p-3 rounded-lg">
                <h5 className="font-medium">{selectedProperty.internetHeading}</h5>
                <p className="text-sm text-muted-foreground">{selectedProperty.displayAddress}</p>
                <p className="text-sm text-muted-foreground">{selectedProperty.internetPrice}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={!selectedProperty}
          >
            Link Property
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
