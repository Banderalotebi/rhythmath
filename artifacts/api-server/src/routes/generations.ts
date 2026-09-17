import { RecordGenerationBody } from "@workspace/api-zod";
import { db, generationsTable } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/generations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = RecordGenerationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [generation] = await db.insert(generationsTable).values({
    id: randomUUID(),
    ownerId: req.user.id,
    ...parsed.data,
    durationMs: parsed.data.durationMs ?? null,
  }).returning();
  const { ownerId: _ownerId, ...response } = generation;
  res.status(201).json(response);
});

export default router;