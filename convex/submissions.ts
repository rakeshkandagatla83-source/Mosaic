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
    position: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("submissions", {
      storageId: args.storageId,
      name: args.name,
      mobileNumber: args.mobileNumber,
      status: "approved",
      position: args.position,
      createdAt: Date.now(),
    });
  },
});
