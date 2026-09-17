import { jsonb, pgTable, real, text, timestamp, integer } from "drizzle-orm/pg-core";

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  tradition: text("tradition").notNull(),
  style: text("style").notNull(),
  tempo: real("tempo").notNull(),
  bars: integer("bars").notNull(),
  meter: jsonb("meter").notNull(),
  pattern: jsonb("pattern").notNull(),
  kitId: text("kit_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;