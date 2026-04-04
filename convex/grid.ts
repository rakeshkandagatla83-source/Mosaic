import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Initialize or fetch the current grid limits
export const getActiveGrid = query({
  args: {},
  handler: async (ctx) => {
    let grid = await ctx.db.query("masterGrid").first();
    if (!grid) {
      // Default cinematic 16:9 bounds mapping 2040 active slots
      return {
        cols: 60,
        rows: 34,
        targetTotal: 60 * 34,
      };
    }
    return grid;
  },
});

// Expand the grid dynamically (also handles initial creation if empty)
export const expandGrid = mutation({
  args: {
    addCols: v.number(),
    addRows: v.number(),
  },
  handler: async (ctx, args) => {
    const grid = await ctx.db.query("masterGrid").first();
    if (grid) {
      const newCols = grid.cols + args.addCols;
      const newRows = grid.rows + args.addRows;
      await ctx.db.patch(grid._id, {
        cols: newCols,
        rows: newRows,
        targetTotal: newCols * newRows,
      });
    } else {
      // Fallback base dimensions + expansion
      const cols = 60 + args.addCols;
      const rows = 34 + args.addRows;
      await ctx.db.insert("masterGrid", {
        cols,
        rows,
        targetTotal: cols * rows,
      });
    }
  },
});
