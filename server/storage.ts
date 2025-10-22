// Reference: javascript_database blueprint for DatabaseStorage implementation
import { db } from "./db";
import { eq, and, isNull, count } from "drizzle-orm";
import {
  campaigns,
  vendors,
  forms,
  submissions,
  accessLinks,
  type Campaign,
  type InsertCampaign,
  type Vendor,
  type InsertVendor,
  type Form,
  type InsertForm,
  type Submission,
  type InsertSubmission,
  type AccessLink,
  type InsertAccessLink,
} from "@shared/schema";

export interface IStorage {
  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;

  // Vendors
  getVendors(campaignId?: string): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;

  // Forms
  getForms(campaignId?: string): Promise<Form[]>;
  getForm(id: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, form: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: string): Promise<void>;

  // Submissions
  getSubmissions(filters?: { campaignId?: string; formId?: string; vendorId?: string }): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;

  // Access Links
  getAccessLinks(): Promise<AccessLink[]>;
  getAccessLinkByToken(token: string): Promise<AccessLink | undefined>;
  createAccessLink(link: InsertAccessLink): Promise<AccessLink>;
  markAccessLinkUsed(token: string): Promise<void>;

  // Stats
  getStats(): Promise<{
    campaigns: number;
    vendors: number;
    forms: number;
    submissions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns);
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values(insertCampaign)
      .returning();
    return campaign;
  }

  async updateCampaign(id: string, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Vendors
  async getVendors(campaignId?: string): Promise<Vendor[]> {
    if (campaignId) {
      return await db.select().from(vendors).where(eq(vendors.campaignId, campaignId));
    }
    return await db.select().from(vendors);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(insertVendor)
      .returning();
    return vendor;
  }

  async updateVendor(id: string, updateData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor || undefined;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  // Forms (global - not filtered by campaign)
  async getForms(campaignId?: string): Promise<Form[]> {
    // Forms are now global and available to all campaigns
    // campaignId parameter kept for backward compatibility but ignored
    return await db.select().from(forms);
  }

  async getForm(id: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form || undefined;
  }

  async createForm(insertForm: InsertForm): Promise<Form> {
    const [form] = await db
      .insert(forms)
      .values(insertForm)
      .returning();
    return form;
  }

  async updateForm(id: string, updateData: Partial<InsertForm>): Promise<Form | undefined> {
    const [form] = await db
      .update(forms)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return form || undefined;
  }

  async deleteForm(id: string): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  // Submissions
  async getSubmissions(filters?: { campaignId?: string; formId?: string; vendorId?: string }): Promise<Submission[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return await db.select().from(submissions);
    }

    const conditions = [];
    if (filters.campaignId) conditions.push(eq(submissions.campaignId, filters.campaignId));
    if (filters.formId) conditions.push(eq(submissions.formId, filters.formId));
    if (filters.vendorId) conditions.push(eq(submissions.vendorId, filters.vendorId));

    return await db.select().from(submissions).where(and(...conditions));
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission || undefined;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db
      .insert(submissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  // Access Links
  async getAccessLinks(): Promise<AccessLink[]> {
    return await db.select().from(accessLinks);
  }

  async getAccessLinkByToken(token: string): Promise<AccessLink | undefined> {
    const [link] = await db.select().from(accessLinks).where(eq(accessLinks.token, token));
    return link || undefined;
  }

  async createAccessLink(insertLink: InsertAccessLink): Promise<AccessLink> {
    const [link] = await db
      .insert(accessLinks)
      .values(insertLink)
      .returning();
    return link;
  }

  async markAccessLinkUsed(token: string): Promise<void> {
    await db
      .update(accessLinks)
      .set({ usedAt: new Date() })
      .where(eq(accessLinks.token, token));
  }

  // Stats
  async getStats(): Promise<{ campaigns: number; vendors: number; forms: number; submissions: number }> {
    const [campaignCount] = await db.select({ count: count() }).from(campaigns);
    const [vendorCount] = await db.select({ count: count() }).from(vendors);
    const [formCount] = await db.select({ count: count() }).from(forms);
    const [submissionCount] = await db.select({ count: count() }).from(submissions);

    return {
      campaigns: Number(campaignCount?.count || 0),
      vendors: Number(vendorCount?.count || 0),
      forms: Number(formCount?.count || 0),
      submissions: Number(submissionCount?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
