import { describe, expect, it } from "vitest";
import { toPlainText } from "./plainText";

describe("toPlainText", () => {
  it("keeps the words of bold and italic text and drops the tags", () => {
    expect(toPlainText("<b>Track</b> your <i>workouts</i> with <strong>AI</strong>.")).toBe("Track your workouts with AI.");
  });

  it("turns line breaks and paragraphs into line breaks", () => {
    expect(toPlainText("First line<br>Second line<br/>Third")).toBe("First line\nSecond line\nThird");
    expect(toPlainText("<p>One</p><p>Two</p>")).toBe("One\n\nTwo");
  });

  it("writes a list as dashes, the way the demo store text does", () => {
    expect(toPlainText("What you get:<ul><li>Streaks</li><li>Reminders</li></ul>Start today")).toBe(
      "What you get:\n- Streaks\n- Reminders\n\nStart today",
    );
  });

  it("decodes the entities that came with the tags", () => {
    expect(toPlainText("<b>Fast</b> &amp; simple &mdash; no &quot;setup&quot;")).toBe('Fast & simple &mdash; no "setup"');
  });

  it("leaves text without formatting tags exactly as it was", () => {
    for (const text of ["Plain text.\n\n- one\n- two", "If a < b and c > d, it works", "R&amp;D team", "I <3 this app"]) {
      expect(toPlainText(text)).toBe(text);
    }
  });

  it("gives the same result when applied twice", () => {
    const once = toPlainText("<p>Hello <b>there</b></p><ul><li>a</li><li>b</li></ul>");
    expect(toPlainText(once)).toBe(once);
  });
});
