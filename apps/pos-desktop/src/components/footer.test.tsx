import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Footer from "./footer";

describe("Footer", () => {
  it("renders the Cedar Core branding text", () => {
    const html = renderToStaticMarkup(<Footer />);

    expect(html).toContain("Powered by Cedar Core.");
  });
});
