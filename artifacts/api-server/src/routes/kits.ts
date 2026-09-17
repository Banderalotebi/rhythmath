import {
  CreateKitBody,
  DeleteKitParams,
  DeleteSampleParams,
  GetKitParams,
  UploadSampleBody,
  UploadSampleParams,
} from "@workspace/api-zod";
import { db, kitsTable, samplesTable } from "@workspace/db";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { deleteObject, storeObject, streamObject } from "../lib/objectStorage";

const router: IRouter = Router();
const audioExtensions = new Set([".wav", ".mp3", ".flac", ".ogg", ".oga", ".m4a", ".aac", ".aiff", ".aif"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    const accepted = file.mimetype.startsWith("audio/") ||
      audioExtensions.has(path.extname(file.originalname).toLowerCase());
    if (accepted) callback(null, true);
    else callback(new Error("Only audio files are accepted"));
  },
});

function requireAuth(
  req: Request,
  res: Response,
): req is Request & Express.AuthedRequest {
  if (req.isAuthenticated()) return true;
  res.status(401).json({ error: "Unauthorized" });
  return false;
}

function sampleResponse(sample: typeof samplesTable.$inferSelect) {
  const { storageKey: _storageKey, ...result } = sample;
  return { ...result, url: `/api/samples/${sample.id}/audio` };
}

async function ownedKit(id: string, ownerId: string) {
  const [kit] = await db.select().from(kitsTable).where(and(
    eq(kitsTable.id, id),
    eq(kitsTable.ownerId, ownerId),
  ));
  return kit;
}

router.get("/kits", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const rows = await db.select({
    id: kitsTable.id,
    ownerId: kitsTable.ownerId,
    name: kitsTable.name,
    tradition: kitsTable.tradition,
    sampleCount: count(samplesTable.id),
    createdAt: kitsTable.createdAt,
  }).from(kitsTable).leftJoin(samplesTable, eq(samplesTable.kitId, kitsTable.id))
    .where(eq(kitsTable.ownerId, req.user.id))
    .groupBy(kitsTable.id)
    .orderBy(desc(kitsTable.createdAt));
  res.json(rows);
});

router.post("/kits", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = CreateKitBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const [kit] = await db.insert(kitsTable).values({
    id: randomUUID(),
    ownerId: req.user.id,
    ...parsed.data,
  }).returning();
  res.status(201).json({ ...kit, sampleCount: 0 });
});

router.get("/kits/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = GetKitParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const kit = await ownedKit(parsed.data.id, req.user.id);
  if (!kit) return void res.status(404).json({ error: "Kit not found" });
  const samples = await db.select().from(samplesTable)
    .where(eq(samplesTable.kitId, kit.id)).orderBy(asc(samplesTable.createdAt));
  res.json({ ...kit, sampleCount: samples.length, samples: samples.map(sampleResponse) });
});

router.delete("/kits/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = DeleteKitParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const kit = await ownedKit(parsed.data.id, req.user.id);
  if (!kit) return void res.status(404).json({ error: "Kit not found" });
  const samples = await db.select({ storageKey: samplesTable.storageKey })
    .from(samplesTable).where(eq(samplesTable.kitId, kit.id));
  await Promise.all(samples.map(({ storageKey }) => deleteObject(storageKey)));
  await db.delete(kitsTable).where(eq(kitsTable.id, kit.id));
  res.status(204).end();
});

router.post("/kits/:id/samples", (req, res) => {
  if (!requireAuth(req, res)) return;
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      res.status(400).json({ error: uploadError.message });
      return;
    }
    const params = UploadSampleParams.safeParse(req.params);
    const body = UploadSampleBody.safeParse({ ...req.body, file: req.file?.originalname });
    if (!params.success || !body.success || !req.file) {
      res.status(400).json({ error: "Invalid sample upload" });
      return;
    }
    if (body.data.licenseAccepted !== "true" || !["0", "1", "2", "3"].includes(body.data.band)) {
      res.status(400).json({ error: "License acceptance and band 0..3 are required" });
      return;
    }
    const kit = await ownedKit(params.data.id, req.user.id);
    if (!kit) {
      res.status(404).json({ error: "Kit not found" });
      return;
    }
    const id = randomUUID();
    const extension = path.extname(req.file.originalname).toLowerCase() || ".audio";
    const storageKey = `kits/${kit.id}/${id}${extension}`;
    const sha256 = createHash("sha256").update(req.file.buffer).digest("hex");
    await storeObject(storageKey, req.file.buffer, req.file.mimetype);
    try {
      const [sample] = await db.insert(samplesTable).values({
        id,
        kitId: kit.id,
        instrument: body.data.instrument,
        band: Number(body.data.band),
        storageKey,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        sha256,
      }).returning();
      res.status(201).json(sampleResponse(sample));
    } catch (error) {
      await deleteObject(storageKey);
      throw error;
    }
  });
});

router.delete("/samples/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = DeleteSampleParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const [sample] = await db.select({ id: samplesTable.id, storageKey: samplesTable.storageKey })
    .from(samplesTable).innerJoin(kitsTable, eq(kitsTable.id, samplesTable.kitId))
    .where(and(eq(samplesTable.id, parsed.data.id), eq(kitsTable.ownerId, req.user.id)));
  if (!sample) return void res.status(404).json({ error: "Sample not found" });
  await deleteObject(sample.storageKey);
  await db.delete(samplesTable).where(eq(samplesTable.id, sample.id));
  res.status(204).end();
});

router.get("/samples/:id/audio", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const [sample] = await db.select({
    storageKey: samplesTable.storageKey,
    mimeType: samplesTable.mimeType,
    originalName: samplesTable.originalName,
  }).from(samplesTable).innerJoin(kitsTable, eq(kitsTable.id, samplesTable.kitId))
    .where(and(eq(samplesTable.id, req.params.id), eq(kitsTable.ownerId, req.user.id)));
  if (!sample) return void res.status(404).json({ error: "Sample not found" });
  res.setHeader("Content-Type", sample.mimeType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  const stream = streamObject(sample.storageKey);
  stream.on("error", (error) => res.destroy(error));
  stream.pipe(res);
});

export default router;