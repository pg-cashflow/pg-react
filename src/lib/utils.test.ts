import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "./utils";

describe("rupeesToPaise", () => {
  it.each([
    ["0", 0],
    ["0.00", 0],
    ["0.01", 1],
    ["19.99", 1999],
    ["1,234.56", 123456],
    ["1,23,456.78", 12345678],
    [" 250.5 ", 25050],
    [1500, 150000],
    [0, 0],
  ])("parses valid input %j -> %i paise", (input, expected) => {
    expect(rupeesToPaise(input)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["250abc"],
    ["-10"],
    ["-0.01"],
    ["1e5"],
    ["12.345"],
    ["1,23,45.67"],
    ["1234,56"],
    ["99999999999999999"],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [-5],
  ])("rejects invalid input %j -> 0", (input) => {
    expect(rupeesToPaise(input)).toBe(0);
  });
});
