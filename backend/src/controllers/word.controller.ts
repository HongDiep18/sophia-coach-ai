import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { lookupWord } from "../services/word.service.js";

const wordRequestSchema = z.object({
  word: z.string().min(1).max(120),
  contextSentence: z.string().max(2000).optional(),
});

export async function postWordLookup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = wordRequestSchema.parse(req.body);
    const data = await lookupWord(payload);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}
