import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const kitsTable = pgTable("kits", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  tradition: text("tradition").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Kit = typeof kitsTable.$inferSelect;
export type NewKit = typeof kitsTable.$inferInsert;