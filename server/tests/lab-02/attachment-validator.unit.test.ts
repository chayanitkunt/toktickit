import { describe, expect, it } from "vitest";
import {
  isAllowedAttachmentMimeType,
  isAllowedAttachmentSize,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "../../src/attachmentValidation.js";

describe("isAllowedAttachmentMimeType", () => {
  it("accepts JPG, PNG, WEBP, and PDF mime types", () => {
    expect(isAllowedAttachmentMimeType("image/jpeg")).toBe(true);
    expect(isAllowedAttachmentMimeType("image/png")).toBe(true);
    expect(isAllowedAttachmentMimeType("image/webp")).toBe(true);
    expect(isAllowedAttachmentMimeType("application/pdf")).toBe(true);
  });

  it("rejects unsupported mime types", () => {
    expect(isAllowedAttachmentMimeType("application/zip")).toBe(false);
    expect(isAllowedAttachmentMimeType("application/x-msdownload")).toBe(
      false
    );
    expect(isAllowedAttachmentMimeType("text/plain")).toBe(false);
    expect(isAllowedAttachmentMimeType("")).toBe(false);
  });
});

describe("isAllowedAttachmentSize", () => {
  it("accepts files at or under the 5 MB limit", () => {
    expect(isAllowedAttachmentSize(1)).toBe(true);
    expect(isAllowedAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES)).toBe(true);
  });

  it("rejects files over the 5 MB limit", () => {
    expect(isAllowedAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES + 1)).toBe(
      false
    );
  });

  it("rejects zero-byte or negative sizes", () => {
    expect(isAllowedAttachmentSize(0)).toBe(false);
    expect(isAllowedAttachmentSize(-1)).toBe(false);
  });
});
