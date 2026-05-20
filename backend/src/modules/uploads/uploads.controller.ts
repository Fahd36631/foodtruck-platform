import type { UploadApiResponse } from "cloudinary";
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

const sanitizePublicIdStem = (name: string): string => {
  const base = name.replace(/\\/g, "/").split("/").pop()?.replace(/^\.+/, "") ?? "license";
  const withoutExt = base.replace(/\.[a-z0-9]{1,24}$/i, "");
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_|_$/g, "");
  const stem = cleaned.slice(0, 48);
  return stem.length > 0 ? stem : "license";
};

type UploadResponseBody = {
  url: string;
  secure_url: string;
  original_secure_url: string;
  public_id: string | undefined;
  format: string | undefined;
  resource_type: string | undefined;
};

/** PDF licenses must use resource_type raw only — never image/upload pipeline. */
export const uploadSingle = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("UPLOAD_FILE_MISSING");
  }
  const file = req.file;
  const originalName = file.originalname?.trim() || "upload.bin";
  const mime = file.mimetype ?? "";
  const bufferStartsWithPdfMagic = file.buffer.length >= 4 && file.buffer.subarray(0, 4).toString("utf8") === "%PDF";

  const looksPdf =
    mime === "application/pdf" ||
    mime === "application/x-pdf" ||
    /\.pdf$/i.test(originalName) ||
    bufferStartsWithPdfMagic;

  const resourceType: "raw" | "auto" = looksPdf ? "raw" : "auto";

  const uploaded = await new Promise<UploadResponseBody>((resolve, reject) => {
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

    const stream = cloudinary.uploader.upload_stream(
      looksPdf
        ? {
            folder: "foodtruck-platform",
            resource_type: "raw",
            use_filename: false,
            unique_filename: false,
            public_id: `${sanitizePublicIdStem(originalName)}_${uniqueSuffix}.pdf`
          }
        : {
            folder: "foodtruck-platform",
            resource_type: "auto",
            use_filename: true,
            unique_filename: true
          },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(new AppError("INTERNAL_ERROR", { message: "Cloudinary upload failed", details: error }));
          return;
        }

        console.log("UPLOAD_FILE_DEBUG", {
          originalname: file.originalname,
          mimetype: file.mimetype,
          resourceType,
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type
        });

        const originalSecure = String(result.secure_url ?? "");
        let finalUrl = originalSecure;
        const fmtLower = (result.format ?? "").toLowerCase();

        if (
          result.resource_type === "raw" &&
          (fmtLower === "pdf" || looksPdf) &&
          originalSecure.length > 0 &&
          !originalSecure.split(/[?#]/)[0].toLowerCase().endsWith(".pdf")
        ) {
          finalUrl = `${originalSecure}.pdf`;
        }

        resolve({
          url: finalUrl,
          secure_url: finalUrl,
          original_secure_url: originalSecure,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type
        });
      }
    );

    stream.end(file.buffer);
  });

  res.status(StatusCodes.CREATED).json(ok("File uploaded", uploaded));
};
import type { Request, Response } from "express";
import type { UploadApiResponse } from "cloudinary";
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

const sanitizePublicIdStem = (name: string): string => {
  const base = name.replace(/\\/g, "/").split("/").pop()?.replace(/^\.+/, "") ?? "license";
  const withoutExt = base.replace(/\.[a-z0-9]{1,24}$/i, "");
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_|_$/g, "");
  const stem = cleaned.slice(0, 48);
  return stem.length > 0 ? stem : "license";
};

<<<<<<< Updated upstream
/** PDF licenses must stay on `resource_type: raw` with a `.pdf` public_id suffix so URLs end with .pdf (iOS / Expo MIME). */
=======
type UploadResponseBody = {
  url: string;
  secure_url: string;
  original_secure_url: string;
  public_id: string | undefined;
  format: string | undefined;
  resource_type: string | undefined;
};

/** PDF licenses must use resource_type raw only — never image/upload pipeline. */
>>>>>>> Stashed changes
export const uploadSingle = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("UPLOAD_FILE_MISSING");
  }
  const file = req.file;
  const originalName = file.originalname?.trim() || "upload.bin";
  const mime = file.mimetype ?? "";
  const bufferStartsWithPdfMagic = file.buffer.length >= 4 && file.buffer.subarray(0, 4).toString("utf8") === "%PDF";

  const looksPdf =
    mime === "application/pdf" ||
    mime === "application/x-pdf" ||
    /\.pdf$/i.test(originalName) ||
    bufferStartsWithPdfMagic;
<<<<<<< Updated upstream

  const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

=======

  const resourceType: "raw" | "auto" = looksPdf ? "raw" : "auto";

  const uploaded = await new Promise<UploadResponseBody>((resolve, reject) => {
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

>>>>>>> Stashed changes
    const stream = cloudinary.uploader.upload_stream(
      looksPdf
        ? {
            folder: "foodtruck-platform",
            resource_type: "raw",
            use_filename: false,
            unique_filename: false,
            public_id: `${sanitizePublicIdStem(originalName)}_${uniqueSuffix}.pdf`
          }
        : {
            folder: "foodtruck-platform",
            resource_type: "auto",
            use_filename: true,
            unique_filename: true
          },
<<<<<<< Updated upstream
      (error, result) => {
=======
      (error, result?: UploadApiResponse) => {
>>>>>>> Stashed changes
        if (error || !result) {
          reject(new AppError("INTERNAL_ERROR", { message: "Cloudinary upload failed", details: error }));
          return;
        }

<<<<<<< Updated upstream
        if (looksPdf) {
          const url = String(result.secure_url ?? "");
          const urlPath = url.split("?")[0]?.toLowerCase() ?? "";
          if (!urlPath.endsWith(".pdf")) {
            reject(
              new AppError("INTERNAL_ERROR", {
                message: "PDF upload did not produce a URL ending with .pdf",
                details: { secure_url: url, public_id: result.public_id }
              })
            );
            return;
          }
          console.log("UPLOADED_LICENSE_SECURE_URL", result.secure_url);
        }

        resolve({ secure_url: result.secure_url, public_id: result.public_id });
=======
        console.log("UPLOAD_FILE_DEBUG", {
          originalname: file.originalname,
          mimetype: file.mimetype,
          resourceType,
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type
        });

        const originalSecure = String(result.secure_url ?? "");
        let finalUrl = originalSecure;
        const fmtLower = (result.format ?? "").toLowerCase();

        if (
          result.resource_type === "raw" &&
          (fmtLower === "pdf" || looksPdf) &&
          originalSecure.length > 0 &&
          !originalSecure.split(/[?#]/)[0].toLowerCase().endsWith(".pdf")
        ) {
          finalUrl = `${originalSecure}.pdf`;
        }

        resolve({
          url: finalUrl,
          secure_url: finalUrl,
          original_secure_url: originalSecure,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type
        });
>>>>>>> Stashed changes
      }
    );

    stream.end(file.buffer);
  });

  res.status(StatusCodes.CREATED).json(ok("File uploaded", uploaded));
};
