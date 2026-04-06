import { describe, it, expect } from "vitest";
import { enqueueItem, removeItem, dequeueItem } from "../usePromptQueue";

describe("enqueueItem", () => {
  it("appends to empty queue", () => {
    expect(enqueueItem([], "hello")).toEqual(["hello"]);
  });

  it("appends to existing queue", () => {
    expect(enqueueItem(["first"], "second")).toEqual(["first", "second"]);
  });

  it("does not mutate original array", () => {
    const original = ["first"];
    enqueueItem(original, "second");
    expect(original).toEqual(["first"]);
  });
});

describe("removeItem", () => {
  it("removes item at index 0", () => {
    expect(removeItem(["a", "b", "c"], 0)).toEqual(["b", "c"]);
  });

  it("removes item at middle index", () => {
    expect(removeItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("removes item at last index", () => {
    expect(removeItem(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });

  it("returns same array when index is out of bounds", () => {
    expect(removeItem(["a"], 5)).toEqual(["a"]);
  });

  it("does not mutate original array", () => {
    const original = ["a", "b"];
    removeItem(original, 0);
    expect(original).toEqual(["a", "b"]);
  });
});

describe("dequeueItem", () => {
  it("returns first item and remaining queue", () => {
    const result = dequeueItem(["first", "second", "third"]);
    expect(result.next).toBe("first");
  });

  it("returns remaining items after dequeue", () => {
    const result = dequeueItem(["first", "second", "third"]);
    expect(result.remaining).toEqual(["second", "third"]);
  });

  it("returns undefined next for empty queue", () => {
    const result = dequeueItem([]);
    expect(result.next).toBeUndefined();
  });

  it("returns empty remaining for empty queue", () => {
    const result = dequeueItem([]);
    expect(result.remaining).toEqual([]);
  });

  it("returns empty remaining for single-item queue", () => {
    const result = dequeueItem(["only"]);
    expect(result.remaining).toEqual([]);
  });
});
