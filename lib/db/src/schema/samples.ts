import { check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { kitsTable } from "./kits";

export const samplesTable = pgTable(
  "samples",
  {
    id: text("id").primaryKey(),
    kitId: text("kit_id")
      .notNull()
      .references(() => kitsTable.id, { onDelete: "cascade" }),
    instrument: text("instrument").notNull(),
    band: integer("band").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    mimeType: text("mime_type").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("samples_band_check", sql`${table.band} between 0 and 3`)],
);

export type Sample = typeof samplesTable.$inferSelect;
export type NewSample = typeof samplesTable.$inferInsert;