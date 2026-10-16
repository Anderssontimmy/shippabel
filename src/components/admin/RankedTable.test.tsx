import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankedTable } from "./RankedTable";

describe("ranked table", () => {
  it("shows each name next to its number, and a second column when it has one", () => {
    render(
      <RankedTable
        title="Pages"
        column="Views"
        extraColumn="Visitors"
        rows={[{ name: "/pricing", value: 6, extra: 4 }, { name: "/blog/publish-lovable-app", value: 3, extra: 3 }]}
        empty="No page views yet."
      />,
    );
    const row = screen.getByRole("row", { name: /\/pricing/ });
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toEqual(["4", "6"]);
    expect(screen.getByRole("rowheader", { name: "/blog/publish-lovable-app" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Views" })).toBeTruthy();
  });

  it("does not hide a name by collapsing its column", () => {
    render(<RankedTable title="Sources" column="Visitors" rows={[{ name: "news.ycombinator.com", value: 6 }]} empty="" />);
    // a table cell with max-w-0 is rendered zero wide, which is what emptied every name in the first version
    expect(screen.getByRole("rowheader").className).not.toContain("max-w-0");
    expect(screen.getByRole("rowheader").className).toContain("w-full");
  });

  it("says so when there is nothing to rank", () => {
    render(<RankedTable title="Countries" column="Visitors" rows={[]} empty="No visits yet." />);
    expect(screen.getByText("No visits yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
