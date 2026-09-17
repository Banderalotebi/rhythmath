import { integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

export const generationsTable = pgTable("generations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  tradition: text("tradition").notNull(),
  style: text("style").notNull(),
  tempo: real("tempo").notNull(),
  bars: integer("bars").notNull(),
  candidateCount: integer("candidate_count").notNull(),
  bestScore: real("best_score").notNull(),
  durationMs: real("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Generation = typeof generationsTable.$inferSelect;
export type NewGeneration = typeof generationsTable.$inferInsert;