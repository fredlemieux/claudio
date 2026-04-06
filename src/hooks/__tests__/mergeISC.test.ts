import { describe, it, expect } from "vitest";
import { mergeISC } from "../useISC";
import type { ISCriterion } from "../../types";

function criterion(id: string, description: string, status: ISCriterion["status"] = "pending"): ISCriterion {
  return { id, description, status };
}

describe("mergeISC", () => {
  it("appends a new criterion to empty list", () => {
    const result = mergeISC([], [criterion("ISC-C1", "Tests pass")]);
    expect(result).toHaveLength(1);
  });

  it("preserves existing criteria when appending new", () => {
    const prev = [criterion("ISC-C1", "First")];
    const result = mergeISC(prev, [criterion("ISC-C2", "Second")]);
    expect(result[0].id).toBe("ISC-C1");
  });

  it("appends new criterion at the end", () => {
    const prev = [criterion("ISC-C1", "First")];
    const result = mergeISC(prev, [criterion("ISC-C2", "Second")]);
    expect(result[1].id).toBe("ISC-C2");
  });

  it("replaces existing criterion by id in full mode", () => {
    const prev = [criterion("ISC-C1", "Old description", "pending")];
    const result = mergeISC(prev, [criterion("ISC-C1", "New description", "completed")]);
    expect(result[0].description).toBe("New description");
  });

  it("replaces status when replacing in full mode", () => {
    const prev = [criterion("ISC-C1", "Desc", "pending")];
    const result = mergeISC(prev, [criterion("ISC-C1", "Desc", "completed")]);
    expect(result[0].status).toBe("completed");
  });

  it("does not duplicate when merging existing id", () => {
    const prev = [criterion("ISC-C1", "Desc")];
    const result = mergeISC(prev, [criterion("ISC-C1", "Updated")]);
    expect(result).toHaveLength(1);
  });

  it("updates only status in statusOnly mode", () => {
    const prev = [criterion("ISC-C1", "Original description", "pending")];
    const result = mergeISC(prev, [criterion("ISC-C1", "Ignored description", "completed")], true);
    expect(result[0].status).toBe("completed");
  });

  it("preserves description in statusOnly mode", () => {
    const prev = [criterion("ISC-C1", "Original description", "pending")];
    const result = mergeISC(prev, [criterion("ISC-C1", "Ignored description", "completed")], true);
    expect(result[0].description).toBe("Original description");
  });

  it("still appends new criteria in statusOnly mode", () => {
    const prev = [criterion("ISC-C1", "First")];
    const result = mergeISC(prev, [criterion("ISC-C2", "Second")], true);
    expect(result).toHaveLength(2);
  });

  it("handles multiple incoming criteria in one call", () => {
    const prev = [criterion("ISC-C1", "First")];
    const incoming = [criterion("ISC-C1", "Updated"), criterion("ISC-C2", "New")];
    const result = mergeISC(prev, incoming);
    expect(result).toHaveLength(2);
  });

  it("does not mutate the previous array", () => {
    const prev = [criterion("ISC-C1", "First")];
    const copy = [...prev];
    mergeISC(prev, [criterion("ISC-C1", "Updated")]);
    expect(prev[0].description).toBe(copy[0].description);
  });

  it("preserves domain field in statusOnly mode", () => {
    const prev = [{ ...criterion("ISC-C1", "Desc", "pending"), domain: "Build" }];
    const result = mergeISC(prev, [criterion("ISC-C1", "Ignored", "completed")], true);
    expect(result[0].domain).toBe("Build");
  });
});
