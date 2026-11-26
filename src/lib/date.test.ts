import { describe, expect, it } from "vitest";
import { formatPyxisOperatingHours, formatPyxisTime, parsePyxisDateTime } from "./date";

describe("Pyxis date helpers", () => {
  it("parses the server wall-clock format without using Date", () => {
    expect(parsePyxisDateTime("2026-09-09 23:55:00")).toEqual({
      year: 2026,
      month: 9,
      day: 9,
      hour: 23,
      minute: 55,
      second: 0,
    });
    expect(formatPyxisTime("2026-09-09 23:55:00")).toBe("23:55");
  });

  it("marks an overnight operating period as next day", () => {
    expect(formatPyxisOperatingHours("2300", "0500")).toBe("23:00 ~ 익일 05:00");
  });
});
