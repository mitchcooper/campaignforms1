// Seed script to populate initial campaign forms data
import { db } from "./db";
import { campaigns, vendors, forms } from "@shared/schema";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create a sample campaign
    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: "Spring Auction Campaign",
        status: "active",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-05-31"),
      })
      .returning();

    console.log("✓ Created campaign:", campaign.name);

    // Create sample vendors
    const [vendor1] = await db
      .insert(vendors)
      .values({
        campaignId: campaign.id,
        name: "Smith Family",
        email: "smith@example.com",
        phone: "+64 21 123 4567",
      })
      .returning();

    const [vendor2] = await db
      .insert(vendors)
      .values({
        campaignId: campaign.id,
        name: "Jones Property Group",
        email: "jones@example.com",
        phone: "+64 21 987 6543",
      })
      .returning();

    console.log("✓ Created vendors:", vendor1.name, "and", vendor2.name);

    // Create a sample form (global, available to all campaigns)
    const [form] = await db
      .insert(forms)
      .values({
        title: "Vendor Details Form",
        description: "Collect vendor property and contact information",
        template: `# Vendor Details
Please provide your property and contact details

## Contact Information

### Owner Name
- label: "Owner Name"
- field: owner_name
- required: true
- chip: vendor.name
- placeholder: "Enter your full name"

### Email Address
- label: "Email Address"
- field: email
- type: email
- required: true
- chip: vendor.email
- placeholder: "your.email@example.com"

### Phone Number
- label: "Phone Number"
- field: phone
- chip: vendor.phone
- placeholder: "+64 21 123 4567"

## Property Details

### Property Address
- label: "Property Address"
- field: property_address
- type: textarea
- required: true
- chip: listing.displayAddress

### Property Type
- label: "Property Type"
- field: property_type
- type: select
- options: Residential House, Apartment, Townhouse, Commercial, Land

### Additional Notes
- label: "Additional Notes"
- field: additional_notes
- type: textarea
- placeholder: "Any additional information you'd like to share..."`,
        version: 1,
        isActive: true,
      })
      .returning();

    console.log("✓ Created form:", form.title);

    console.log("\n✅ Database seeded successfully!");
    console.log(`
Campaign: ${campaign.name}
Vendors: ${vendor1.name}, ${vendor2.name}
Form: ${form.title}
    `);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seed completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
