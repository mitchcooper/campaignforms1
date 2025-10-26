import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCampaignSchema,
  insertVendorSchema,
  insertFormSchema,
  insertSubmissionSchema,
  insertAccessLinkSchema,
} from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  compileTemplate,
  renderFormWithData,
  validateSubmission,
  invalidateTemplateCache,
  getOrCompileTemplate,
} from "./template-processor";
import { DataInjector, type ChipContext } from "@shared/template-parser";
import multer from "multer";
import { generateTemplateFromPDF, generateTemplateFromDescription } from "./openai-service";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const tmpDir = path.join(os.tmpdir(), "form-wizard-uploads");
      await fs.mkdir(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const data = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(data);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const data = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(req.params.id, data);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const vendors = await storage.getVendors(campaignId);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const data = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(data);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", async (req, res) => {
    try {
      const data = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, data);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // Form routes
  app.get("/api/forms", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const forms = await storage.getForms(campaignId);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ error: "Failed to fetch forms" });
    }
  });

  app.get("/api/forms/:id", async (req, res) => {
    try {
      const form = await storage.getForm(req.params.id);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  app.post("/api/forms", async (req, res) => {
    try {
      const baseData = insertFormSchema.parse(req.body);

      // Compile template if provided
      let compiled = null;
      if (baseData.template) {
        compiled = compileTemplate(baseData.template);

        if (!compiled.isValid) {
          return res.status(400).json({
            error: "Invalid form template",
            details: compiled.errors,
          });
        }
      }

      const formData = {
        ...baseData,
        ast: compiled?.ast,
        htmlPreview: compiled?.htmlPreview,
      };

      const form = await storage.createForm(formData);
      res.status(201).json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating form:", error);
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  // AI Form Wizard endpoint
  app.post("/api/forms/wizard", upload.single("pdf"), async (req, res) => {
    let filePath: string | undefined;

    try {
      // Check if we have a PDF file or a text description
      if (req.file) {
        // PDF upload mode
        filePath = req.file.path;
        const userInstructions = req.body.instructions || undefined;

        console.log(`Processing PDF wizard request: ${req.file.originalname}`);

        const result = await generateTemplateFromPDF(filePath, userInstructions);

        res.json({
          template: result.template,
          analysis: result.analysis,
          source: "pdf",
          fileName: req.file.originalname,
        });
      } else if (req.body.description) {
        // Text description mode
        console.log("Processing description wizard request");

        const result = await generateTemplateFromDescription(req.body.description);

        res.json({
          template: result.template,
          analysis: result.analysis,
          source: "description",
        });
      } else {
        return res.status(400).json({
          error: "Either a PDF file or a text description is required",
        });
      }
    } catch (error: any) {
      console.error("Error in form wizard:", error);

      if (error.message?.includes("OPENAI_API_KEY")) {
        return res.status(500).json({
          error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
        });
      }

      if (error.code === "insufficient_quota") {
        return res.status(429).json({
          error: "OpenAI API quota exceeded. Please check your API usage.",
        });
      }

      res.status(500).json({
        error: error.message || "Failed to generate form template",
      });
    } finally {
      // Clean up uploaded file
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (cleanupError) {
          console.error("Error cleaning up temporary file:", cleanupError);
        }
      }
    }
  });

  app.patch("/api/forms/:id", async (req, res) => {
    try {
      const data = insertFormSchema.partial().parse(req.body);

      // Compile template if provided
      let compiled = null;
      if (data.template) {
        compiled = compileTemplate(data.template);

        if (!compiled.isValid) {
          return res.status(400).json({
            error: "Invalid form template",
            details: compiled.errors,
          });
        }
      }

      const formData = compiled
        ? {
            ...data,
            ast: compiled.ast,
            htmlPreview: compiled.htmlPreview,
          }
        : data;

      const form = await storage.updateForm(req.params.id, formData);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Invalidate cache for this form
      invalidateTemplateCache(req.params.id);

      res.json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating form:", error);
      res.status(500).json({ error: "Failed to update form" });
    }
  });

  app.delete("/api/forms/:id", async (req, res) => {
    try {
      await storage.deleteForm(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ error: "Failed to delete form" });
    }
  });

  // Form Instance routes
  app.post("/api/form-instances", async (req, res) => {
    try {
      const { formId, campaignId, data, signingMode } = req.body;
      
      const formInstance = await storage.createFormInstance({
        formId,
        campaignId,
        data: data || {},
        signingMode: signingMode || "all",
        status: "draft",
      });
      
      res.status(201).json(formInstance);
    } catch (error) {
      console.error("Error creating form instance:", error);
      res.status(500).json({ error: "Failed to create form instance" });
    }
  });

  app.get("/api/form-instances/:id", async (req, res) => {
    try {
      const formInstance = await storage.getFormInstance(req.params.id);
      if (!formInstance) {
        return res.status(404).json({ error: "Form instance not found" });
      }
      res.json(formInstance);
    } catch (error) {
      console.error("Error fetching form instance:", error);
      res.status(500).json({ error: "Failed to fetch form instance" });
    }
  });

  app.patch("/api/form-instances/:id/data", async (req, res) => {
    try {
      const { data } = req.body;
      const formInstance = await storage.updateFormInstanceData(req.params.id, data);
      if (!formInstance) {
        return res.status(404).json({ error: "Form instance not found" });
      }
      res.json(formInstance);
    } catch (error) {
      console.error("Error updating form instance data:", error);
      if (error.message?.includes("cannot be modified")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update form instance data" });
    }
  });

  app.post("/api/form-instances/:id/sign", async (req, res) => {
    try {
      const { signatoryId, signatureData } = req.body;
      const signatory = await storage.recordSignature(signatoryId, signatureData);
      if (!signatory) {
        return res.status(404).json({ error: "Signatory not found" });
      }
      res.json(signatory);
    } catch (error) {
      console.error("Error recording signature:", error);
      if (error.message?.includes("voided")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to record signature" });
    }
  });

  app.get("/api/form-instances/:id/signatories", async (req, res) => {
    try {
      const signatories = await storage.getSignatoriesForFormInstance(req.params.id);
      res.json(signatories);
    } catch (error) {
      console.error("Error fetching signatories:", error);
      res.status(500).json({ error: "Failed to fetch signatories" });
    }
  });

  app.get("/api/form-instances/:id/status", async (req, res) => {
    try {
      const status = await storage.getFormInstanceStatus(req.params.id);
      res.json(status);
    } catch (error) {
      console.error("Error fetching form instance status:", error);
      res.status(500).json({ error: "Failed to fetch form instance status" });
    }
  });

  // Void a form instance
  app.post("/api/form-instances/:id/void", async (req, res) => {
    try {
      const { voidedBy, reason } = req.body;
      if (!voidedBy) {
        return res.status(400).json({ error: "voidedBy is required" });
      }
      
      const formInstance = await storage.voidFormInstance(req.params.id, voidedBy, reason);
      if (!formInstance) {
        return res.status(404).json({ error: "Form instance not found" });
      }
      res.json(formInstance);
    } catch (error) {
      console.error("Error voiding form instance:", error);
      res.status(500).json({ error: "Failed to void form instance" });
    }
  });

  // Unlock a form instance
  app.post("/api/form-instances/:id/unlock", async (req, res) => {
    try {
      const { unlockedBy } = req.body;
      if (!unlockedBy) {
        return res.status(400).json({ error: "unlockedBy is required" });
      }
      
      const formInstance = await storage.unlockFormInstance(req.params.id, unlockedBy);
      if (!formInstance) {
        return res.status(404).json({ error: "Form instance not found" });
      }
      res.json(formInstance);
    } catch (error) {
      console.error("Error unlocking form instance:", error);
      res.status(500).json({ error: "Failed to unlock form instance" });
    }
  });

  // Get read-only view of completed/voided form
  app.get("/api/form-instances/:id/read-only", async (req, res) => {
    try {
      const formInstance = await storage.getFormInstance(req.params.id);
      if (!formInstance) {
        return res.status(404).json({ error: "Form instance not found" });
      }
      
      // Only allow read-only access for completed or voided forms
      if (formInstance.status !== "completed" && formInstance.status !== "voided") {
        return res.status(403).json({ error: "Form instance is not in read-only state" });
      }
      
      res.json(formInstance);
    } catch (error) {
      console.error("Error fetching read-only form instance:", error);
      res.status(500).json({ error: "Failed to fetch form instance" });
    }
  });

  // Submission routes
  app.get("/api/submissions", async (req, res) => {
    try {
      const filters = {
        campaignId: req.query.campaignId as string | undefined,
        formId: req.query.formId as string | undefined,
        vendorId: req.query.vendorId as string | undefined,
      };
      const submissions = await storage.getSubmissions(filters);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/submissions", async (req, res) => {
    try {
      const { formId, campaignId, vendorId, data: submissionData, formInstanceId, signatureData } = req.body;

      // Validate against template schema
      const form = await storage.getForm(formId);
      if (!form || !form.template) {
        return res.status(404).json({ error: "Form not found or has no template" });
      }

      const compiled = getOrCompileTemplate(formId, form.template);
      if (!compiled.isValid) {
        return res.status(500).json({ error: "Form template is invalid" });
      }

      const validation = validateSubmission(compiled, submissionData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Form validation failed",
          details: validation.errors,
        });
      }

      // If this is a form instance, update the shared data
      if (formInstanceId && validation.normalizedData) {
        await storage.updateFormInstanceData(formInstanceId, validation.normalizedData);
        
        // If signature data is provided, record the signature
        if (signatureData) {
          // Find the signatory for this vendor
          const signatories = await storage.getSignatoriesForFormInstance(formInstanceId);
          const token = req.headers.authorization?.replace('Bearer ', '') || '';
          const accessLink = await storage.getAccessLinkByToken(token);
          const signatory = signatories.find(s => s.accessLinkId && accessLink?.vendorId === vendorId);
          
          if (signatory) {
            await storage.recordSignature(signatory.id, signatureData);
          }
        }
      }

      // Create submission with validated data
      const submissionPayload = {
        formId,
        campaignId,
        vendorId: vendorId || null,
        formInstanceId: formInstanceId || null,
        data: validation.normalizedData,
        templateVersion: form.version,
        status: "submitted",
      };

      const baseData = insertSubmissionSchema.parse(submissionPayload);
      const submission = await storage.createSubmission(baseData);
      
      // Check if all vendors for this campaign+form have submitted
      // If yes, update campaignForm status to "completed"
      try {
        const campaignData = await storage.getCampaignFull(campaignId);
        if (campaignData) {
          const sentForm = campaignData.sentForms.find(sf => sf.formId === formId);
          if (sentForm) {
            const formSubmissions = campaignData.submissions.filter(s => s.formId === formId);
            const accessLinks = await storage.getAccessLinksForCampaignForm(campaignId, formId);
            
            // If all vendors who have access links have submitted
            if (accessLinks.length > 0 && formSubmissions.length >= accessLinks.length) {
              // Update campaignForm status to completed
              await storage.updateCampaignForm(sentForm.id, { status: "completed" });
            }
          }
        }
      } catch (statusUpdateError) {
        // Don't fail the submission if status update fails
        console.error("Error updating campaign form status:", statusUpdateError);
      }
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating submission:", error);
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  // Access Link routes
  app.post("/api/links/issue", async (req, res) => {
    try {
      const { vendorId, campaignId, formId, expiresInHours = 168, formInstanceId, signatoryName, signatoryEmail, signatoryRole } = req.body;

      if (!vendorId || !campaignId || !formId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

      const link = await storage.createAccessLink({
        token,
        vendorId,
        campaignId,
        formId,
        formInstanceId,
        signatoryRole,
        expiresAt,
        usedAt: null,
      });

      // If this is for a form instance, add the signatory
      if (formInstanceId && signatoryName) {
        await storage.addSignatory({
          formInstanceId,
          accessLinkId: link.id,
          signatoryName,
          signatoryEmail,
        });
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.PROD_URL || `http://localhost:${process.env.PORT || 5000}`)
        : (process.env.DEV_URL || `http://localhost:${process.env.PORT || 5000}`);
      
      const url = `${baseUrl}/form/${token}`;

      res.json({ url, token });
    } catch (error) {
      console.error("Error issuing link:", error);
      res.status(500).json({ error: "Failed to issue link" });
    }
  });

  app.get("/api/links/resolve", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const link = await storage.getAccessLinkByToken(token);

      if (!link) {
        return res.status(404).json({ error: "Invalid or expired link" });
      }

      if (link.expiresAt < new Date()) {
        return res.status(404).json({ error: "Link has expired" });
      }

      const form = await storage.getForm(link.formId);
      const vendor = await storage.getVendor(link.vendorId);
      const campaign = await storage.getCampaign(link.campaignId);

      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Compile/get cached template
      const compiled = form.template ? getOrCompileTemplate(link.formId, form.template) : null;

      if (!compiled) {
        return res.status(500).json({ error: "Form template is invalid" });
      }

      // If this is a form instance, get the shared data
      let formInstance = null;
      let signatories: Awaited<ReturnType<typeof storage.getSignatoriesForFormInstance>> = [];
      if (link.formInstanceId) {
        formInstance = await storage.getFormInstance(link.formInstanceId);
        
        // Check if form instance is voided
        if (formInstance?.status === "voided") {
          return res.status(403).json({ 
            error: "This form has been voided and is no longer accessible",
            voidedAt: formInstance.voidedAt,
            voidedBy: formInstance.voidedBy,
            voidedReason: formInstance.voidedReason
          });
        }
        
        signatories = await storage.getSignatoriesForFormInstance(link.formInstanceId);
      }

      // Build chip context for data injection
      const chipContext: ChipContext = {
        vendor: vendor ? {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          meta: vendor.meta || {},
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        } : undefined,
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          listingId: campaign.listingId,
          manualAddress: campaign.manualAddress,
          listingData: campaign.listingData,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        } : undefined,
        listing: campaign?.listingData || undefined,
      };

      // Resolve chip values using DataInjector
      const dataInjector = new DataInjector();
      const resolvedAST = dataInjector.injectData(compiled.ast, chipContext);

      // Extract prefill data from resolved chip values
      const prefill: Record<string, any> = {};
      
      // Walk through the resolved AST to extract chip values
      for (const page of resolvedAST.pages) {
        for (const section of page.sections) {
          for (const field of section.fields) {
            if (field.type !== "divider" && field.type !== "conditional") {
              const fieldWithChip = field as any;
              if (fieldWithChip.__chipValue !== undefined) {
                prefill[field.id] = fieldWithChip.__chipValue;
              }
            }
          }
        }
      }

      res.json({
        formId: link.formId,
        campaignId: link.campaignId,
        vendorId: link.vendorId,
        formInstanceId: link.formInstanceId,
        formAST: resolvedAST,
        formTitle: form.title,
        campaignName: campaign?.name,
        formInstance,
        signatories: signatories.map(s => ({
          id: s.id,
          signatoryName: s.signatoryName,
          signedAt: s.signedAt,
        })),
        prefill,
      });
    } catch (error) {
      console.error("Error resolving link:", error);
      res.status(500).json({ error: "Failed to resolve link" });
    }
  });

  // New campaign management routes
  app.get("/api/campaigns/:id/full", async (req, res) => {
    try {
      const campaignData = await storage.getCampaignFull(req.params.id);
      if (!campaignData) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaignData);
    } catch (error) {
      console.error("Error fetching campaign full data:", error);
      res.status(500).json({ error: "Failed to fetch campaign data" });
    }
  });

  // Cooper & Co API proxy routes
  app.get("/api/cooper/listings/search", async (req, res) => {
    try {
      const { cooperAPI } = await import("./cooper-api");
      const params = {
        count: req.query.count ? parseInt(req.query.count as string) : 100,
        statuses: req.query.listingStatuses ? 
          (Array.isArray(req.query.listingStatuses) ? req.query.listingStatuses : [req.query.listingStatuses]) as string[] : 
          undefined,
        officeIds: req.query.listingBranchId ? 
          (Array.isArray(req.query.listingBranchId) ? req.query.listingBranchId : [req.query.listingBranchId]) as string[] : 
          undefined,
        expand: req.query.expand as string,
        cursor: req.query.cursor as string,
        soldDateFrom: req.query.soldDateFrom as string,
        searchText: req.query.searchText as string,
        listingTypes: req.query.listingTypes ? 
          (Array.isArray(req.query.listingTypes) ? req.query.listingTypes : [req.query.listingTypes]) as string[] : 
          undefined,
      };
      
      const results = await cooperAPI.searchProperties(params);
      res.json(results);
    } catch (error) {
      console.error("Error searching Cooper listings:", error);
      res.status(500).json({ error: "Failed to search listings" });
    }
  });

  app.get("/api/cooper/listings/:id", async (req, res) => {
    try {
      const { cooperAPI } = await import("./cooper-api");
      const listingId = parseInt(req.params.id);
      const listing = await cooperAPI.getPropertyDetails(listingId);
      res.json(listing);
    } catch (error) {
      console.error("Error fetching Cooper listing:", error);
      res.status(500).json({ error: "Failed to fetch listing details" });
    }
  });

  app.get("/api/cooper/branches", async (req, res) => {
    try {
      const { cooperAPI } = await import("./cooper-api");
      const branches = await cooperAPI.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching Cooper branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Campaign listing management
  app.post("/api/campaigns/:id/link-listing", async (req, res) => {
    try {
      const { listingId, listingData } = req.body;
      if (!listingId || !listingData) {
        return res.status(400).json({ error: "listingId and listingData are required" });
      }
      
      const campaign = await storage.linkListingToCampaign(req.params.id, listingId, listingData);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error linking listing to campaign:", error);
      res.status(500).json({ error: "Failed to link listing" });
    }
  });

  app.post("/api/campaigns/:id/refresh-listing", async (req, res) => {
    try {
      const { listingData } = req.body;
      if (!listingData) {
        return res.status(400).json({ error: "listingData is required" });
      }
      
      const campaign = await storage.refreshCampaignListing(req.params.id, listingData);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error refreshing campaign listing:", error);
      res.status(500).json({ error: "Failed to refresh listing" });
    }
  });

  // Form sending to campaigns
  app.post("/api/campaigns/:id/send-form", async (req, res) => {
    try {
      const { formId, sentBy } = req.body;
      if (!formId || !sentBy) {
        return res.status(400).json({ error: "formId and sentBy are required" });
      }
      
      const campaignForm = await storage.sendFormToCampaign(req.params.id, formId, sentBy);
      res.status(201).json(campaignForm);
    } catch (error) {
      console.error("Error sending form to campaign:", error);
      res.status(500).json({ error: "Failed to send form" });
    }
  });

  app.get("/api/campaigns/:id/sent-forms", async (req, res) => {
    try {
      const sentForms = await storage.getCampaignSentForms(req.params.id);
      res.json(sentForms);
    } catch (error) {
      console.error("Error fetching sent forms:", error);
      res.status(500).json({ error: "Failed to fetch sent forms" });
    }
  });

  app.get("/api/campaigns/:id/forms/:formId/access-links", async (req, res) => {
    try {
      const accessLinks = await storage.getAccessLinksForCampaignForm(req.params.id, req.params.formId);
      res.json(accessLinks);
    } catch (error) {
      console.error("Error fetching access links:", error);
      res.status(500).json({ error: "Failed to fetch access links" });
    }
  });

  // Re-send form to additional vendors
  app.post("/api/campaigns/:id/forms/:formId/resend", async (req, res) => {
    try {
      const { vendorIds, expiresInHours = 168 } = req.body;
      
      if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
        return res.status(400).json({ error: "vendorIds array is required" });
      }

      const campaignId = req.params.id;
      const formId = req.params.formId;

      // Check if form is already sent to campaign
      const campaignData = await storage.getCampaignFull(campaignId);
      if (!campaignData) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const sentForm = campaignData.sentForms.find(sf => sf.formId === formId);
      if (!sentForm) {
        return res.status(404).json({ error: "Form not found in campaign" });
      }

      // Generate new access links for selected vendors
      const links = [];
      for (const vendorId of vendorIds) {
        const vendor = campaignData.vendors.find(v => v.id === vendorId);
        if (!vendor) continue;

        const token = randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

        const link = await storage.createAccessLink({
          token,
          vendorId,
          campaignId,
          formId,
          expiresAt,
          usedAt: null,
        });

        const baseUrl = process.env.NODE_ENV === 'production' 
          ? (process.env.PROD_URL || `http://localhost:${process.env.PORT || 5000}`)
          : (process.env.DEV_URL || `http://localhost:${process.env.PORT || 5000}`);
        const url = `${baseUrl}/form/${token}`;

        links.push({
          vendorId,
          vendorName: vendor.name,
          url,
          token,
        });
      }

      res.json({ links });
    } catch (error) {
      console.error("Error re-sending form:", error);
      res.status(500).json({ error: "Failed to re-send form" });
    }
  });

  // Vendor portal data
  app.get("/api/vendor-portal/:vendorId", async (req, res) => {
    try {
      const portalData = await storage.getVendorPortalData(req.params.vendorId);
      if (!portalData) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(portalData);
    } catch (error) {
      console.error("Error fetching vendor portal data:", error);
      res.status(500).json({ error: "Failed to fetch vendor portal data" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
