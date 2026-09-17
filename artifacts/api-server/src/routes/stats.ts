import { db, generationsTable, projectsTable, samplesTable } from "@workspace/db";
import { avg, count, desc, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  const [[projectCount], [generationStats], [sampleCount], byTradition, topStyles] = await Promise.all([
    db.select({ value: count() }).from(projectsTable),
    db.select({ value: count(), average: avg(generationsTable.durationMs) }).from(generationsTable),
    db.select({ value: count() }).from(samplesTable),
    db.select({ tradition: generationsTable.tradition, count: count() }).from(generationsTable)
      .groupBy(generationsTable.tradition),
    db.select({ style: generationsTable.style, tradition: generationsTable.tradition, count: count() })
      .from(generationsTable).groupBy(generationsTable.style, generationsTable.tradition)
      .orderBy(desc(count())).limit(10),
  ]);
  res.json({
    projects: projectCount.value,
    generations: generationStats.value,
    samplesUploaded: sampleCount.value,
    averageGenerationMs: generationStats.average === null ? null : Number(generationStats.average),
    generationsByTradition: byTradition,
    topStyles,
  });
});

router.get("/activity", async (_req, res) => {
  const result = await db.execute(sql`
    select id, 'generation' as kind, tradition, style, tempo, created_at as "createdAt"
    from generations
    union all
    select id, 'project' as kind, tradition, style, tempo, created_at as "createdAt"
    from projects
    order by "createdAt" desc
    limit 20
  `);
  res.json(result.rows);
});

export default router;