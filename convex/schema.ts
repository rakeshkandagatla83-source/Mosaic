import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  submissions: defineTable({
    storageId: v.id("_storage"), // Convex cloud storage ID for the compressed jpeg
    name: v.string(), // Extracted name
    mobileNumber: v.string(), // Extracted mobile
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
});
