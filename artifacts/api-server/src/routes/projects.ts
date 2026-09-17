import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectBody,
  UpdateProjectParams,
  DeleteProjectParams,
  DuplicateProjectParams,
} from "@workspace/api-zod";
import { db, projectsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

function requireAuth(
  req: Request,
  res: Response,
): req is Request & Express.AuthedRequest {
  if (req.isAuthenticated()) return true;
  res.status(401).json({ error: "Unauthorized" });
  return false;
}

function invalid(res: Response, error: unknown) {
  res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
}

router.get("/projects", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const rows = await db.select().from(projectsTable)
    .where(eq(projectsTable.ownerId, req.user.id))
    .orderBy(desc(projectsTable.createdAt));
  res.json(rows);
});

router.post("/projects", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const { name, pattern, kitId = null } = parsed.data;
  const [row] = await db.insert(projectsTable).values({
    id: randomUUID(),
    ownerId: req.user.id,
    name,
    tradition: pattern.tradition,
    style: pattern.style,
    tempo: pattern.tempo,
    bars: pattern.bars,
    meter: pattern.meter,
    pattern,
    kitId,
  }).returning();
  res.status(201).json(row);
});

router.get("/projects/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) return invalid(res, parsed.error);
  const [row] = await db.select().from(projectsTable).where(and(
    eq(projectsTable.id, parsed.data.id),
    eq(projectsTable.ownerId, req.user.id),
  ));
  if (!row) return void res.status(404).json({ error: "Project not found" });
  res.json(row);
});

router.put("/projects/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success) return invalid(res, params.error);
  if (!body.success) return invalid(res, body.error);
  const values: Record<string, unknown> = { ...body.data, updatedAt: new Date() };
  if (body.data.pattern) {
    Object.assign(values, {
      tradition: body.data.pattern.tradition,
      style: body.data.pattern.style,
      tempo: body.data.pattern.tempo,
      bars: body.data.pattern.bars,
      meter: body.data.pattern.meter,
    });
  }
  const [row] = await db.update(projectsTable).set(values).where(and(
    eq(projectsTable.id, params.data.id),
    eq(projectsTable.ownerId, req.user.id),
  )).returning();
  if (!row) return void res.status(404).json({ error: "Project not found" });
  res.json(row);
});

router.delete("/projects/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = DeleteProjectParams.safeParse(req.params);
  if (!parsed.success) return invalid(res, parsed.error);
  const [row] = await db.delete(projectsTable).where(and(
    eq(projectsTable.id, parsed.data.id),
    eq(projectsTable.ownerId, req.user.id),
  )).returning({ id: projectsTable.id });
  if (!row) return void res.status(404).json({ error: "Project not found" });
  res.status(204).end();
});

router.post("/projects/:id/duplicate", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = DuplicateProjectParams.safeParse(req.params);
  if (!parsed.success) return invalid(res, parsed.error);
  const [source] = await db.select().from(projectsTable).where(and(
    eq(projectsTable.id, parsed.data.id),
    eq(projectsTable.ownerId, req.user.id),
  ));
  if (!source) return void res.status(404).json({ error: "Project not found" });
  const [copy] = await db.insert(projectsTable).values({
    ...source,
    id: randomUUID(),
    name: `${source.name} (copy)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  res.status(201).json(copy);
});

export default router;