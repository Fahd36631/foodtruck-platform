import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import multer from "multer";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../core/errors";
import { ok } from "../../core/http/api-response";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "") || ".bin";
    const baseName = path
      .basename(file.originalname || "upload", extension)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .slice(0, 40);
    cb(null, `${Date.now()}-${baseName}${extension}`);
  }
});

export const uploadSingleMiddleware = multer({ storage }).single("file");

export const uploadSingle = (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("UPLOAD_FILE_MISSING");
  }

  const host = req.get("host");
  const protocol = req.protocol;
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res
    .status(StatusCodes.CREATED)
    .json(ok("File uploaded", { url: fileUrl, fileName: req.file.originalname }));
};
