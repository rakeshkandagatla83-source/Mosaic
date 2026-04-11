import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  submissions: defineTable({
    storageId: v.id("_storage"), // Convex cloud storage ID for the compressed jpeg
    name: v.string(), // Extracted name
    mobileNumber: v.string(), // Extracted mobile
    comment: v.optional(v.string()), // Added user comment field
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    position: v.optional(v.number()), // The master grid position this photo occupies (only set if approved)
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_mobile", ["mobileNumber"]), // Fast indexing for unique user lookup

  masterGrid: defineTable({
    cols: v.number(),
    rows: v.number(),
    targetTotal: v.number(), // Tracks active boundary array limit
  }),

  // Global configuration for the campaign reveal and banners
  campaignConfig: defineTable({
    isLive: v.boolean(),
    desktopBannerId: v.optional(v.id("_storage")),
    mobileBannerId: v.optional(v.id("_storage")),
    masterImageId: v.optional(v.id("_storage")), // Upload main background image instead of base-image.jpg
    targetGoal: v.number(), // The 2039 goal
    useDuplicatedFill: v.boolean(), // Option to fill preview with clones
  }),

  bulkErrors: defineTable({
    name: v.string(),
    mobileNumber: v.string(),
    comment: v.optional(v.string()),
    fileName: v.string(),
    errorType: v.union(v.literal("missing"), v.literal("duplicate"), v.literal("error")),
    createdAt: v.number(),
  }),
});
