import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: error.issues.map((issue) => issue.message),
    });
    return;
  }

  // Errors that already know their HTTP status + machine code (e.g. quota
  // exhausted) pass through cleanly so the client can branch on `code`.
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
      ...(error.retryAfterMs != null
        ? { retryAfterMs: error.retryAfterMs }
        : {}),
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal error";
  res.status(500).json({ error: message });
}
