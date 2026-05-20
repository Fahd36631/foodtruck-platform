import type { Request, Response } from "express";
import multer from "multer";
import { StatusCodes } from "http-status-codes";

import { cloudinary } from "../../config/cloudinary";
import { AppError } from "../../core/errors";
import { ok } from "../../core/http/api-response";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadSingleMiddleware = upload.single("file");

export const uploadSingle = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("UPLOAD_FILE_MISSING");
  }
  const file = req.file;
  const mimeType = (file.mimetype || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
  const resourceType: "raw" | "auto" = isPdf ? "raw" : "auto";

  const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "foodtruck-platform",
        // Keep truck images untouched, but force license PDFs to raw delivery URLs.
        resource_type: resourceType
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("INTERNAL_ERROR", { message: "Cloudinary upload failed", details: error }));
          return;
        }

        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );

    stream.end(file.buffer);
  });

  res
    .status(StatusCodes.CREATED)
    .json(ok("File uploaded", { url: uploaded.secure_url, public_id: uploaded.public_id }));
};
