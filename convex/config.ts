import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Fetch the global campaign configuration.
 * Automatically initializes if it doesn't exist.
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("campaignConfig").first();
    if (!config) {
      return {
        isLive: false,
        targetGoal: 2039,
        useDuplicatedFill: true,
      };
    }
    
    return {
      ...config,
      desktopBannerUrl: config.desktopBannerId ? await ctx.storage.getUrl(config.desktopBannerId) : null,
      mobileBannerUrl: config.mobileBannerId ? await ctx.storage.getUrl(config.mobileBannerId) : null,
      masterImageUrl: config.masterImageId ? await ctx.storage.getUrl(config.masterImageId) : null,
    };
  },
});

/**
 * Update campaign flags like isLive and targetGoal.
 */
export const updateConfig = mutation({
  args: {
    isLive: v.optional(v.boolean()),
    targetGoal: v.optional(v.number()),
    useDuplicatedFill: v.optional(v.boolean()),
    desktopBannerId: v.optional(v.id("_storage")),
    mobileBannerId: v.optional(v.id("_storage")),
    masterImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("campaignConfig").first();
    const patch = { ...args };
    
    if (config) {
      await ctx.db.patch(config._id, patch);
    } else {
      await ctx.db.insert("campaignConfig", {
        isLive: args.isLive ?? false,
        targetGoal: args.targetGoal ?? 2039,
        useDuplicatedFill: args.useDuplicatedFill ?? true,
        desktopBannerId: args.desktopBannerId,
        mobileBannerId: args.mobileBannerId,
        masterImageId: args.masterImageId,
      });
    }
  },
});
