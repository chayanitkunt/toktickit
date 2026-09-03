// BR-06 / BR-07: Attachment type and size rules. Extracted as pure
// functions (no Multer/Express dependency) so they are unit testable
// in isolation from the upload middleware.
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function isAllowedAttachmentMimeType(mimeType: string): boolean {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(
    mimeType
  );
}

export function isAllowedAttachmentSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_ATTACHMENT_SIZE_BYTES;
}
