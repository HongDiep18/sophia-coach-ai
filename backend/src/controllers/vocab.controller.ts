import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  deleteVocab,
  listVocab,
  saveVocab,
  updateVocabStatus,
} from "../services/vocab.service.js";

const saveVocabSchema = z.object({
  word: z.string().trim().min(1).max(120),
  meaning: z.string().max(2000).optional(),
  vietnamese: z.string().max(2000).optional(),
  example: z.string().max(2000).optional(),
});

const updateStatusSchema = z.object({
  learning_status: z.enum(["new", "learning", "mastered"]),
});

const idSchema = z.string().uuid();

export async function getVocab(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const items = await listVocab();
    res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
}

export async function postVocab(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = saveVocabSchema.parse(req.body);
    const result = await saveVocab(payload);
    // 201 when a new row was stored, 200 when it already existed.
    res.status(result.status === "created" ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchVocab(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = idSchema.parse(req.params.id);
    const { learning_status } = updateStatusSchema.parse(req.body);
    const item = await updateVocabStatus(id, learning_status);
    if (!item) {
      res.status(404).json({ error: "Vocabulary item not found" });
      return;
    }
    res.status(200).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function removeVocab(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = idSchema.parse(req.params.id);
    const deleted = await deleteVocab(id);
    if (!deleted) {
      res.status(404).json({ error: "Vocabulary item not found" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}
