import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generates a short-lived URL for the client layer to upload compressed blobs to
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
      
      // Map the internal storage IDs to accessible frontend URLs
    return Promise.all(
      submissions.map(async (sub) => ({
        ...sub,
        url: await ctx.storage.getUrl(sub.storageId),
      }))
    );
  },
});

export const getApproved = query({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
      
    return Promise.all(
      submissions.map(async (sub) => ({
        ...sub,
        url: await ctx.storage.getUrl(sub.storageId),
      }))
    );
  },
});

export const createSubmission = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mobileNumber: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("submissions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const approveSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, { 
      status: "approved",
      position: args.position 
    });
  },
});

export const rejectSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, { status: "rejected" });
  },
});

// Permanently removes an approved submission and deletes its stored image blob.
// Used by admin to remove someone from the approved mosaic list.
export const removeApproved = mutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return;
    await ctx.storage.delete(sub.storageId);
    await ctx.db.delete(args.submissionId);
  },
});

// Updates an approved user's name, mobile number, and optionally replaces their photo.
// If a new storageId is provided the old blob is deleted to avoid storage leaks.
export const updateSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    name: v.string(),
    mobileNumber: v.string(),
    newStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return;

    const patch: {
      name: string;
      mobileNumber: string;
      storageId?: typeof args.newStorageId;
    } = {
      name: args.name,
      mobileNumber: args.mobileNumber,
    };

    if (args.newStorageId) {
      // Delete the old stored image blob before replacing
      await ctx.storage.delete(sub.storageId);
      patch.storageId = args.newStorageId;
    }

    await ctx.db.patch(args.submissionId, patch);
  },
});


// Admin-direct add: uploads + immediately approves with a colour-matched position.
// Skips the pending queue entirely.
export const adminCreateSubmission = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mobileNumber: v.string(),
    comment: v.optional(v.string()),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("submissions", {
      ...args,
      status: "approved",
      createdAt: Date.now(),
    });
  },
});

/**
 * Bulk upload for admin processing.
 * Inserts a list of approved submission objects.
 */
export const bulkUpload = mutation({
  args: {
    submissions: v.array(v.object({
      name: v.string(),
      mobileNumber: v.string(),
      comment: v.optional(v.string()),
      storageId: v.id("_storage"),
      position: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const sub of args.submissions) {
      // Create new approved submission
      await ctx.db.insert("submissions", {
        ...sub,
        status: "approved",
        createdAt: Date.now(),
      });
      // Important: Remove from bulkErrors if we had previously failed on this mobile number!
      const existingErrors = await ctx.db
        .query("bulkErrors")
        .filter(q => q.eq(q.field("mobileNumber"), sub.mobileNumber))
        .collect();
      for (const err of existingErrors) {
        await ctx.db.delete(err._id);
      }
    }
  },
});

export const getBulkErrors = query({
  handler: async (ctx) => {
    return await ctx.db.query("bulkErrors").order("desc").collect();
  },
});

export const logBulkErrors = mutation({
  args: {
    errors: v.array(v.object({
      name: v.string(),
      mobileNumber: v.string(),
      comment: v.optional(v.string()),
      fileName: v.string(),
      errorType: v.union(v.literal("missing"), v.literal("duplicate"), v.literal("error")),
    })),
  },
  handler: async (ctx, args) => {
    for (const err of args.errors) {
      await ctx.db.insert("bulkErrors", {
        ...err,
        createdAt: Date.now(),
      });
    }
  },
});

export const removeBulkError = mutation({
  args: { errorId: v.id("bulkErrors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.errorId);
  },
});
