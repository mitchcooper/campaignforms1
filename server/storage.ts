// Reference: javascript_database blueprint for DatabaseStorage implementation
import { db } from "./db";
import { eq, and, isNull, count } from "drizzle-orm";
import {
  campaigns,
  vendors,
  forms,
  submissions,
  accessLinks,
  campaignForms,
  formInstances,
  signatories,
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
  type CampaignForm,
  type InsertCampaignForm,
  type FormInstance,
  type InsertFormInstance,
  type Signatory,
  type InsertSignatory,
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
  getAccessLinksForCampaignForm(campaignId: string, formId: string): Promise<AccessLink[]>;

  // Stats
  getStats(): Promise<{
    campaigns: number;
    vendors: number;
    forms: number;
    submissions: number;
  }>;

  // New campaign management methods
  getCampaignFull(id: string): Promise<{
    campaign: Campaign;
    vendors: Vendor[];
    sentForms: Array<CampaignForm & { form: Form; submissionCount: number; totalVendors: number }>;
    submissions: Submission[];
  } | undefined>;
  
  linkListingToCampaign(campaignId: string, listingId: number, listingData: any): Promise<Campaign | undefined>;
  
  refreshCampaignListing(campaignId: string, listingData: any): Promise<Campaign | undefined>;
  
  sendFormToCampaign(campaignId: string, formId: string, sentBy: string): Promise<CampaignForm>;
  
  getCampaignSentForms(campaignId: string): Promise<CampaignForm[]>;
  
  updateCampaignForm(id: string, data: Partial<InsertCampaignForm>): Promise<CampaignForm | undefined>;
  
  getVendorPortalData(vendorId: string): Promise<{
    vendor: Vendor;
    campaign: Campaign;
    sentForms: CampaignForm[];
    submissions: Submission[];
  } | undefined>;

  // Form Instances
  createFormInstance(instance: InsertFormInstance): Promise<FormInstance>;
  getFormInstance(id: string): Promise<FormInstance | undefined>;
  updateFormInstanceData(id: string, data: Record<string, any>): Promise<FormInstance | undefined>;
  getFormInstanceStatus(id: string): Promise<{
    status: string;
    requiredFieldsComplete: boolean;
    signatoriesSigned: number;
    totalSignatories: number;
    readyToSign: boolean;
  }>;
  
  // Form Instance State Management
  canModifyFormInstance(id: string): Promise<boolean>;
  voidFormInstance(id: string, voidedBy: string, reason?: string): Promise<FormInstance | undefined>;
  unlockFormInstance(id: string, unlockedBy: string): Promise<FormInstance | undefined>;
  lockFormInstance(id: string): Promise<FormInstance | undefined>;
  completeFormInstance(id: string): Promise<FormInstance | undefined>;
  
  // Signatories
  addSignatory(signatory: InsertSignatory): Promise<Signatory>;
  recordSignature(signatoryId: string, signatureData: any): Promise<Signatory | undefined>;
  getSignatoriesForFormInstance(formInstanceId: string): Promise<Signatory[]>;
  checkFormInstanceComplete(formInstanceId: string): Promise<boolean>;
  clearAllSignatures(formInstanceId: string): Promise<void>;
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

  async getAccessLinksForCampaignForm(campaignId: string, formId: string): Promise<AccessLink[]> {
    return await db.select().from(accessLinks)
      .where(and(
        eq(accessLinks.campaignId, campaignId),
        eq(accessLinks.formId, formId)
      ));
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

  // New campaign management methods
  async getCampaignFull(id: string): Promise<{
    campaign: Campaign;
    vendors: Vendor[];
    sentForms: Array<CampaignForm & { form: Form; submissionCount: number; totalVendors: number }>;
    submissions: Submission[];
  } | undefined> {
    const campaign = await this.getCampaign(id);
    if (!campaign) return undefined;

    const vendors = await this.getVendors(id);
    const sentForms = await this.getCampaignSentForms(id);
    const submissions = await this.getSubmissions({ campaignId: id });

    // Enrich sentForms with form details and submission counts
    const enrichedSentForms = await Promise.all(
      sentForms.map(async (campaignForm) => {
        const form = await this.getForm(campaignForm.formId);
        if (!form) return null;

        // Count submissions for this form
        const formSubmissions = submissions.filter(s => s.formId === campaignForm.formId);
        const submissionCount = formSubmissions.length;

        // Count total vendors who have access links for this form
        const accessLinks = await this.getAccessLinksForCampaignForm(id, campaignForm.formId);
        const totalVendors = accessLinks.length;

        return {
          ...campaignForm,
          form,
          submissionCount,
          totalVendors,
        };
      })
    );

    return {
      campaign,
      vendors,
      sentForms: enrichedSentForms.filter(Boolean) as Array<CampaignForm & { form: Form; submissionCount: number; totalVendors: number }>,
      submissions,
    };
  }

  async linkListingToCampaign(campaignId: string, listingId: number, listingData: any): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set({ 
        listingId,
        listingData,
        listingLastFetched: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .returning();
    return campaign || undefined;
  }

  async refreshCampaignListing(campaignId: string, listingData: any): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set({ 
        listingData,
        listingLastFetched: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .returning();
    return campaign || undefined;
  }

  async sendFormToCampaign(campaignId: string, formId: string, sentBy: string): Promise<CampaignForm> {
    const [campaignForm] = await db
      .insert(campaignForms)
      .values({
        campaignId,
        formId,
        sentBy,
        status: 'active'
      })
      .returning();
    return campaignForm;
  }

  async getCampaignSentForms(campaignId: string): Promise<CampaignForm[]> {
    return await db.select().from(campaignForms).where(eq(campaignForms.campaignId, campaignId));
  }

  async updateCampaignForm(id: string, data: Partial<InsertCampaignForm>): Promise<CampaignForm | undefined> {
    const [campaignForm] = await db
      .update(campaignForms)
      .set(data)
      .where(eq(campaignForms.id, id))
      .returning();
    return campaignForm || undefined;
  }

  async getVendorPortalData(vendorId: string): Promise<{
    vendor: Vendor;
    campaign: Campaign;
    sentForms: CampaignForm[];
    submissions: Submission[];
  } | undefined> {
    const vendor = await this.getVendor(vendorId);
    if (!vendor) return undefined;

    const campaign = await this.getCampaign(vendor.campaignId);
    if (!campaign) return undefined;

    const sentForms = await this.getCampaignSentForms(vendor.campaignId);
    const submissions = await this.getSubmissions({ vendorId });

    return {
      vendor,
      campaign,
      sentForms,
      submissions,
    };
  }

  // Form Instances
  async createFormInstance(instance: InsertFormInstance): Promise<FormInstance> {
    const [formInstance] = await db
      .insert(formInstances)
      .values(instance)
      .returning();
    return formInstance;
  }

  async getFormInstance(id: string): Promise<FormInstance | undefined> {
    const [formInstance] = await db
      .select()
      .from(formInstances)
      .where(eq(formInstances.id, id));
    return formInstance || undefined;
  }

  async updateFormInstanceData(id: string, data: Record<string, any>): Promise<FormInstance | undefined> {
    // Check if form instance can be modified
    const canModify = await this.canModifyFormInstance(id);
    if (!canModify) {
      throw new Error("Form instance cannot be modified - it is locked, completed, or voided");
    }

    const [formInstance] = await db
      .update(formInstances)
      .set({ 
        data,
        updatedAt: new Date()
      })
      .where(eq(formInstances.id, id))
      .returning();
    return formInstance || undefined;
  }

  async getFormInstanceStatus(id: string): Promise<{
    status: string;
    requiredFieldsComplete: boolean;
    signatoriesSigned: number;
    totalSignatories: number;
    readyToSign: boolean;
  }> {
    const formInstance = await this.getFormInstance(id);
    if (!formInstance) {
      throw new Error("Form instance not found");
    }

    const signatoriesList = await this.getSignatoriesForFormInstance(id);
    const signedCount = signatoriesList.filter(s => s.signedAt).length;
    
    // This would need to be implemented based on form template validation
    // For now, assume all required fields are complete if data exists
    const formData = formInstance.data as Record<string, any>;
    const requiredFieldsComplete = Object.keys(formData).length > 0;
    
    const readyToSign = requiredFieldsComplete;
    const isComplete = formInstance.signingMode === "any" 
      ? signedCount > 0 
      : signedCount === signatoriesList.length;

    // Use the stored status from database - don't override locked/completed/voided states
    let status = formInstance.status;
    
    // Only recalculate status if it's still in draft state
    if (status === "draft") {
      if (isComplete) {
        status = "completed";
        // Update the database status to completed
        await this.completeFormInstance(id);
      } else if (signedCount > 0) {
        status = "partially_signed";
      } else if (readyToSign) {
        status = "ready_to_sign";
      }
    }

    return {
      status,
      requiredFieldsComplete,
      signatoriesSigned: signedCount,
      totalSignatories: signatoriesList.length,
      readyToSign,
    };
  }

  // Signatories
  async addSignatory(signatory: InsertSignatory): Promise<Signatory> {
    const [newSignatory] = await db
      .insert(signatories)
      .values(signatory)
      .returning();
    return newSignatory;
  }

  async recordSignature(signatoryId: string, signatureData: any): Promise<Signatory | undefined> {
    // Get the signatory to find the form instance
    const [signatory] = await db
      .select()
      .from(signatories)
      .where(eq(signatories.id, signatoryId));
    
    if (!signatory) {
      return undefined;
    }

    // Check if form instance is voided
    const formInstance = await this.getFormInstance(signatory.formInstanceId);
    if (!formInstance || formInstance.status === "voided") {
      throw new Error("Cannot sign a voided form instance");
    }

    // Record the signature
    const [updatedSignatory] = await db
      .update(signatories)
      .set({ 
        signedAt: new Date(),
        signatureData
      })
      .where(eq(signatories.id, signatoryId))
      .returning();

    // Lock the form instance on first signature
    if (formInstance.status === "draft" || formInstance.status === "ready_to_sign") {
      await this.lockFormInstance(signatory.formInstanceId);
    }

    // Check if all signatures are complete
    const isComplete = await this.checkFormInstanceComplete(signatory.formInstanceId);
    if (isComplete) {
      await this.completeFormInstance(signatory.formInstanceId);
    }

    return updatedSignatory || undefined;
  }

  async getSignatoriesForFormInstance(formInstanceId: string): Promise<Signatory[]> {
    return await db
      .select()
      .from(signatories)
      .where(eq(signatories.formInstanceId, formInstanceId));
  }

  async checkFormInstanceComplete(formInstanceId: string): Promise<boolean> {
    const formInstance = await this.getFormInstance(formInstanceId);
    if (!formInstance) return false;

    const signatoriesList = await this.getSignatoriesForFormInstance(formInstanceId);
    const signedCount = signatoriesList.filter(s => s.signedAt).length;
    
    return formInstance.signingMode === "any" 
      ? signedCount > 0 
      : signedCount === signatoriesList.length;
  }

  // Form Instance State Management
  async canModifyFormInstance(id: string): Promise<boolean> {
    const formInstance = await this.getFormInstance(id);
    if (!formInstance) return false;
    
    // Can modify ONLY if status is draft or ready_to_sign (NOT locked, completed, or voided)
    // Once someone signs, the form is locked and cannot be modified
    return formInstance.status === "draft" || formInstance.status === "ready_to_sign";
  }

  async voidFormInstance(id: string, voidedBy: string, reason?: string): Promise<FormInstance | undefined> {
    const [formInstance] = await db
      .update(formInstances)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidedBy,
        voidedReason: reason,
        updatedAt: new Date()
      })
      .where(eq(formInstances.id, id))
      .returning();
    return formInstance || undefined;
  }

  async unlockFormInstance(id: string, unlockedBy: string): Promise<FormInstance | undefined> {
    // Clear all signatures first
    await this.clearAllSignatures(id);
    
    const [formInstance] = await db
      .update(formInstances)
      .set({
        status: "draft",
        unlockedAt: new Date(),
        unlockedBy,
        lockedAt: null,
        completedAt: null,
        updatedAt: new Date()
      })
      .where(eq(formInstances.id, id))
      .returning();
    return formInstance || undefined;
  }

  async lockFormInstance(id: string): Promise<FormInstance | undefined> {
    const [formInstance] = await db
      .update(formInstances)
      .set({
        status: "locked",
        lockedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(formInstances.id, id))
      .returning();
    return formInstance || undefined;
  }

  async completeFormInstance(id: string): Promise<FormInstance | undefined> {
    const [formInstance] = await db
      .update(formInstances)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(formInstances.id, id))
      .returning();
    return formInstance || undefined;
  }

  async clearAllSignatures(formInstanceId: string): Promise<void> {
    await db
      .update(signatories)
      .set({
        signedAt: null,
        signatureData: null
      })
      .where(eq(signatories.formInstanceId, formInstanceId));
  }
}

export const storage = new DatabaseStorage();
