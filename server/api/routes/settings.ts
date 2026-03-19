import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index.js";

export const settingsRouter = Router();

const SETTINGS_KEYS = ["xaiApiKey", "githubToken", "defaultModel"] as const;

settingsRouter.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(schema.settings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    // Mask sensitive keys — return "configured" or null, never the actual value
    res.json({
      ok: true,
      data: {
        xaiApiKey: map.xaiApiKey ? "configured" : null,
        githubToken: map.githubToken ? "configured" : null,
        defaultModel: map.defaultModel ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

settingsRouter.put("/", async (req, res) => {
  try {
    const body = req.body as Partial<Record<(typeof SETTINGS_KEYS)[number], string | null>>;

    for (const key of SETTINGS_KEYS) {
      if (key in body) {
        const value = body[key];
        if (value === null || value === "") {
          // Delete the setting if set to null/empty
          await db.delete(schema.settings).where(eq(schema.settings.key, key));
        } else if (value !== undefined) {
          // Upsert
          const existing = await db
            .select()
            .from(schema.settings)
            .where(eq(schema.settings.key, key))
            .get();

          const now = new Date().toISOString();
          if (existing) {
            await db
              .update(schema.settings)
              .set({ value, updatedAt: now })
              .where(eq(schema.settings.key, key));
          } else {
            await db.insert(schema.settings).values({ key, value, updatedAt: now });
          }
        }
      }
    }

    // Return masked settings
    const rows = await db.select().from(schema.settings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    res.json({
      ok: true,
      data: {
        xaiApiKey: map.xaiApiKey ? "configured" : null,
        githubToken: map.githubToken ? "configured" : null,
        defaultModel: map.defaultModel ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
