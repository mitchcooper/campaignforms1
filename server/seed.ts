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
        json: {
          title: "Vendor Details",
          description: "Please provide your property and contact details",
          pages: [
            {
              name: "page1",
              elements: [
                {
                  type: "text",
                  name: "owner_name",
                  title: "Owner Name",
                  isRequired: true,
                },
                {
                  type: "text",
                  name: "property_address",
                  title: "Property Address",
                  isRequired: true,
                },
                {
                  type: "text",
                  name: "email",
                  title: "Email Address",
                  inputType: "email",
                  isRequired: true,
                  validators: [
                    {
                      type: "email",
                    },
                  ],
                },
                {
                  type: "text",
                  name: "phone",
                  title: "Phone Number",
                  inputType: "tel",
                },
                {
                  type: "dropdown",
                  name: "property_type",
                  title: "Property Type",
                  choices: [
                    "Residential House",
                    "Apartment",
                    "Townhouse",
                    "Commercial",
                    "Land",
                  ],
                },
                {
                  type: "comment",
                  name: "additional_notes",
                  title: "Additional Notes",
                  rows: 4,
                },
              ],
            },
          ],
        },
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
