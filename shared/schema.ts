// Campaign Forms Application - Database Schema
// Reference: javascript_database blueprint for Neon PostgreSQL with Drizzle ORM

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft, active, archived
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  listingId: integer("listing_id"), // Cooper & Co API listing ID
  listingData: json("listing_data"), // Cached listing data from API
  listingLastFetched: timestamp("listing_last_fetched"), // Track when listing data was last updated
  manualAddress: text("manual_address"), // For campaigns without API listings
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Vendors table
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  meta: json("meta"), // Extra fields as JSON
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Forms table - Template-based form definitions (global, available to all campaigns)
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  template: text("template").notNull(), // Markdown template
  ast: json("ast"), // Parsed AST (cached for performance)
  htmlPreview: text("html_preview"), // Cached HTML preview
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Submissions table - Form submission data
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  vendorId: varchar("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  formInstanceId: varchar("form_instance_id").references(() => formInstances.id, { onDelete: "cascade" }),
  data: json("data").notNull(), // Flat JSON: {fieldName: value, ...}
  templateVersion: integer("template_version").notNull().default(1), // Which version of form was used
  status: text("status").notNull().default("submitted"), // "draft", "submitted"
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

// Form Instances table - Shared form state for multi-signatory forms
export const formInstances = pgTable("form_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  data: json("data").notNull(), // Shared field values: {fieldName: value, ...}
  status: text("status").notNull().default("draft"), // draft, ready_to_sign, locked, completed, voided
  signingMode: text("signing_mode").notNull().default("all"), // all, any
  voidedAt: timestamp("voided_at"),
  voidedBy: text("voided_by"),
  voidedReason: text("voided_reason"),
  lockedAt: timestamp("locked_at"),
  completedAt: timestamp("completed_at"),
  unlockedAt: timestamp("unlocked_at"),
  unlockedBy: text("unlocked_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Signatories table - Track who needs to sign each form instance
export const signatories = pgTable("signatories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formInstanceId: varchar("form_instance_id").notNull().references(() => formInstances.id, { onDelete: "cascade" }),
  accessLinkId: varchar("access_link_id").notNull().references(() => accessLinks.id, { onDelete: "cascade" }),
  signatoryName: text("signatory_name").notNull(),
  signatoryEmail: text("signatory_email"),
  signedAt: timestamp("signed_at"),
  signatureData: json("signature_data"), // Canvas signature data or typed signature
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Access Links table - Tokenized links for vendor form access
export const accessLinks = pgTable("access_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  formInstanceId: varchar("form_instance_id").references(() => formInstances.id, { onDelete: "cascade" }),
  signatoryRole: text("signatory_role"), // Optional role/description for display
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Campaign Forms junction table - Track which forms are sent to campaigns
export const campaignForms = pgTable("campaign_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").notNull().default(sql`now()`),
  sentBy: text("sent_by"), // Admin identifier
  status: text("status").notNull().default("pending"), // pending, active, completed, cancelled
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const campaignsRelations = relations(campaigns, ({ many }) => ({
  vendors: many(vendors),
  submissions: many(submissions),
  accessLinks: many(accessLinks),
  campaignForms: many(campaignForms),
  formInstances: many(formInstances),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [vendors.campaignId],
    references: [campaigns.id],
  }),
  submissions: many(submissions),
  accessLinks: many(accessLinks),
}));

export const formsRelations = relations(forms, ({ many }) => ({
  submissions: many(submissions),
  accessLinks: many(accessLinks),
  campaignForms: many(campaignForms),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  form: one(forms, {
    fields: [submissions.formId],
    references: [forms.id],
  }),
  campaign: one(campaigns, {
    fields: [submissions.campaignId],
    references: [campaigns.id],
  }),
  vendor: one(vendors, {
    fields: [submissions.vendorId],
    references: [vendors.id],
  }),
}));

export const accessLinksRelations = relations(accessLinks, ({ one }) => ({
  vendor: one(vendors, {
    fields: [accessLinks.vendorId],
    references: [vendors.id],
  }),
  campaign: one(campaigns, {
    fields: [accessLinks.campaignId],
    references: [campaigns.id],
  }),
  form: one(forms, {
    fields: [accessLinks.formId],
    references: [forms.id],
  }),
}));

export const campaignFormsRelations = relations(campaignForms, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignForms.campaignId],
    references: [campaigns.id],
  }),
  form: one(forms, {
    fields: [campaignForms.formId],
    references: [forms.id],
  }),
}));

export const formInstancesRelations = relations(formInstances, ({ one, many }) => ({
  form: one(forms, {
    fields: [formInstances.formId],
    references: [forms.id],
  }),
  campaign: one(campaigns, {
    fields: [formInstances.campaignId],
    references: [campaigns.id],
  }),
  signatories: many(signatories),
  submissions: many(submissions),
}));

export const signatoriesRelations = relations(signatories, ({ one }) => ({
  formInstance: one(formInstances, {
    fields: [signatories.formInstanceId],
    references: [formInstances.id],
  }),
  accessLink: one(accessLinks, {
    fields: [signatories.accessLinkId],
    references: [accessLinks.id],
  }),
}));

// Insert schemas with Zod validation
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSchema = createInsertSchema(forms)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    ast: true, // Generated server-side
    htmlPreview: true, // Generated server-side
  });

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  startedAt: true,
});

export const insertAccessLinkSchema = createInsertSchema(accessLinks).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignFormSchema = createInsertSchema(campaignForms).omit({
  id: true,
  createdAt: true,
});

export const insertFormInstanceSchema = createInsertSchema(formInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSignatorySchema = createInsertSchema(signatories).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type AccessLink = typeof accessLinks.$inferSelect;
export type InsertAccessLink = z.infer<typeof insertAccessLinkSchema>;

export type CampaignForm = typeof campaignForms.$inferSelect;
export type InsertCampaignForm = z.infer<typeof insertCampaignFormSchema>;

export type FormInstance = typeof formInstances.$inferSelect;
export type InsertFormInstance = z.infer<typeof insertFormInstanceSchema>;

export type FormInstanceStatus = "draft" | "ready_to_sign" | "locked" | "completed" | "voided";

export type Signatory = typeof signatories.$inferSelect;
export type InsertSignatory = z.infer<typeof insertSignatorySchema>;



