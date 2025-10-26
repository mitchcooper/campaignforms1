---
formConfig:
  autoSubmitOnSignature: true
  submitTrigger: "allRequiredSignatures"
---

# Auction Reserve Authority
Strictly Confidential

## Property
### Property Address
- label: "Property Address"
- field: propertyAddress
- type: text
- chip: listing.displayAddress
- placeholder: "Enter address if not pre-filled"

- if: propertyAddress == ""
  - label: "Manual Address (when no listing link)"
  - field: manualAddress
  - type: text
  - chip: campaign.manualAddress
  - placeholder: "e.g. 123 Main Street, Auckland"

## Auction Details
### Auction Date & Time
- label: "Auction Date & Time"
- field: auctionDateTime
- type: datetime
- chip: listing.auctionDateTime
- placeholder: "Select date and time"

### Auction Location
- label: "Auction Location"
- field: auctionLocation
- type: text
- chip: listing.auctionLocation
- placeholder: "Venue or on-site"

## Authority to Sell
To: Cooper & Co Real Estate Ltd (Licensed Agent REAA 2008)

### Reserve Price (NZD)
- label: "The Reserve"
- field: reservePrice
- type: currency
- required: true
- min: 100000
- placeholder: "Enter reserve (NZD)"

We authorise you to accept a figure of, or exceeding, the Reserve (or such other figure as we may subsequently instruct in writing or otherwise on Auction day) and agree to sign or have the Auctioneer (on our behalf) sign the Auction Sale and Purchase Agreement evidencing the sale immediately after the property is declared sold.

## List and Sell Vendor Acknowledgement

The vendor advises that that they have made the choice not to expose the property to marketing and promotional campaign and that they have accepted the offer on this agreement as an 'off market' sale.

The vendor acknowledges that they have made that decision after having been informed by the agency that exposing the property through a marketing and promotion campaign has the potential to obtain the best possible price for the property and that it was recommended to them before the acceptance of this offer that they seek their own independent legal advice and the advice of a registered valuer.

The vendor further acknowledges that they have been advised, and that they accept, that the purchaser may cross-lease, subdivide, renovate, or immediately place the property back on the market either through an agency or privately and by doing so may achieve a higher price than the offer on this agreement.

## Vendor Information

## Settlement & Deposit
### Amount of Deposit
- label: "Deposit Amount (NZD)"
- field: depositAmount
- type: currency
- required: true
- min: 10000
- placeholder: "e.g. 100000"

### Additional Settlement Terms (optional)
- label: "Additional Settlement Terms"
- field: settlementTerms
- type: textarea
- placeholder: "Add any agreed settlement terms (optional)"

## Vendor Bid & Acknowledgements
### Vendor Bid Authorisation
- label: "Authorise Auctioneer to utilise the 'vendor bid' at their discretion up to (but not at or exceeding) the reserve price. We undertake that no other party will bid on our behalf."
- field: vendorBidAuthorised
- type: checkbox
- required: true
- options: I/We agree

### Co-owner Authority Warranty
- label: "We warrant that we have the authority from all or any co-owners of this property to sign this instruction."
- field: coOwnerAuthority
- type: checkbox
- required: true
- options: I/We agree

### Deposit Payment Timing
- label: "We confirm that payment of the required deposit can be made by way of electronic bank transfer no later than the next available working day."
- field: depositTimingConfirmed
- type: checkbox
- required: true
- options: I/We agree

### REINZ Best Practice Guide
- label: "We have sighted and signed a copy of the REINZ best practice guide for auction."
- field: reinzGuideConfirmed
- type: checkbox
- required: true
- options: I/We agree

## If Property Passes In
In the case of the property "passing in" at auction, we instruct as follows:

### First Right of Refusal to Highest Bidder?
- label: "Offer highest bidder first right of refusal at the reserve (or subsequently instructed) figure?"
- field: passInFirstRight
- type: radio
- required: true
- options: Yes, No
- helpText: "Choose one (replaces 'delete one' on the paper form)."

## Authority to Vary Reserve
### Person Authorised to Vary Auction Reserve
- label: "Authorised Person (Name)"
- field: reserveVariationName
- type: text
- required: true
- placeholder: "Full name"

### Authorised Person Contact Number
- label: "Authorised Person Contact Number"
- field: reserveVariationPhone
- type: text
- required: true
- placeholder: "+64 XX XXX XXXX"
- pattern: "^\\+?[0-9\\s\\-\\(\\)]+$"

### Authorised Person Email
- label: "Authorised Person Email"
- field: reserveVariationEmail
- type: email
- required: true
- placeholder: "email@example.com"

## Signatures
### Vendor Name
- label: "Vendor Name"
- field: vendorName1
- type: text
- required: true
- chip: vendor.name
- placeholder: "Full name"

### Vendor Signature
- label: "Vendor Signature"
- field: vendorSignature1
- type: signature
- required: true
- signatory: "vendor.name"
- captureTimestamp: true
- timestampFormat: "d MMM yyyy, h:mm a zzz"
- embedTimestamp: true

---  # Divider for optional second vendor

### Second Vendor Name (if applicable)
- label: "Second Vendor Name"
- field: vendorName2
- type: text
- placeholder: "Full name (if applicable)"

- if: vendorName2 != ""
  - label: "Second Vendor Signature"
  - field: vendorSignature2
  - type: signature
  - required: true
  - captureTimestamp: true
  - timestampFormat: "d MMM yyyy, h:mm a zzz"
  - embedTimestamp: true

---page-break---

## Office Use
Harcourts Cooper & Co Real Estate Ltd — Licensed Agent REAA 2008
- label: "Internal Notes (Office Use Only)"
- field: officeNotes
- type: textarea
- placeholder: "Optional notes (not shown to purchasers)"

