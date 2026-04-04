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
