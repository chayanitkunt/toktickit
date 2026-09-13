import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from "../../src/auth.js";

// UNIT-01 (BR-11) — password hashing helper.
describe("hashPassword / verifyPassword", () => {
  it("never stores the plaintext password in the hash", async () => {
    const hash = await hashPassword("ChangeMe123!");

    expect(hash).not.toBe("ChangeMe123!");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("produces a bcrypt hash (cost factor >= 10, per BR-11)", async () => {
    const hash = await hashPassword("ChangeMe123!");

    // bcrypt hash format: $2b$<cost>$<22-char-salt><31-char-hash>
    const match = hash.match(/^\$2[aby]\$(\d{2})\$/);

    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(10);
  });

  it("verifies a correct password and rejects an incorrect one", async () => {
    const hash = await hashPassword("ChangeMe123!");

    await expect(verifyPassword("ChangeMe123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword1!", hash)).resolves.toBe(
      false
    );
  });

  it("produces a different hash for the same password on each call (unique salt)", async () => {
    const hashA = await hashPassword("ChangeMe123!");
    const hashB = await hashPassword("ChangeMe123!");

    expect(hashA).not.toBe(hashB);
  });
});

// UNIT-03 — password strength validator.
describe("validatePasswordPolicy", () => {
  it("accepts a compliant password", () => {
    const result = validatePasswordPolicy("Str0ng!Pass");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a password that is too short", () => {
    const result = validatePasswordPolicy("Sh0rt!");

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
  });

  it("rejects a password missing an uppercase letter", () => {
    const result = validatePasswordPolicy("weakpass1!");

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must include an uppercase letter"
    );
  });

  it("rejects a password missing a lowercase letter", () => {
    const result = validatePasswordPolicy("WEAKPASS1!");

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must include a lowercase letter"
    );
  });

  it("rejects a password missing a number", () => {
    const result = validatePasswordPolicy("WeakPass!!");

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must include a number");
  });

  it("rejects a password missing a special character", () => {
    const result = validatePasswordPolicy("WeakPass123");

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must include a special character"
    );
  });

  it("rejects an empty password", () => {
    const result = validatePasswordPolicy("");

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
