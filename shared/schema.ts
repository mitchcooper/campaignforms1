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

// Forms table - SurveyJS form definitions (global, available to all campaigns)
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  json: json("json").notNull(), // SurveyJS schema
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
  data: json("data").notNull(), // SurveyJS result JSON
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Access Links table - Tokenized links for vendor form access
export const accessLinks = pgTable("access_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const campaignsRelations = relations(campaigns, ({ many }) => ({
  vendors: many(vendors),
  submissions: many(submissions),
  accessLinks: many(accessLinks),
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

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
});

export const insertAccessLinkSchema = createInsertSchema(accessLinks).omit({
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
