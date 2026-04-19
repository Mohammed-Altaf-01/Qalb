import { describe, expect, it } from "vitest";

import { cn } from "../utils.js";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("joins multiple classes with a space", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("ignores falsy values", () => {
    expect(cn("p-4", false, null, undefined, "m-2")).toBe("p-4 m-2");
  });

  it("handles conditional object syntax", () => {
    expect(cn({ "text-bold": true, "text-italic": false })).toBe("text-bold");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    // tailwind-merge: second p-4 overrides first p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("merges conflicting text color classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string for all falsy arguments", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("handles array of classes", () => {
    expect(cn(["p-4", "m-2"])).toBe("p-4 m-2");
  });

  it("handles mixed conditional and static classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });
});
