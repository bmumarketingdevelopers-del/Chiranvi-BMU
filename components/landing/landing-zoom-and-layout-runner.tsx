"use client";

import { useLayoutEffect } from "react";
import { browserZoomAndLayoutScript as script } from "./landing-zoom-and-layout-script";

/*
  Runs the landing page's zoom and layout script (landing-zoom-and-layout-script.ts) on any page that
  renders this component (the home page and the cart page):
  - On a full page load, the script arrives as plain HTML inside a hidden <div>, so the browser runs it
    before the page is shown (no layout jump). React only sees text, so it does not warn about scripts.
  - When the visitor comes to the landing page from another page of the site (no full page load),
    the browser does not run that HTML, so the script is run here instead.
  The script itself checks whether it already ran, so it never runs twice.
*/

export default function LandingZoomAndLayoutRunner() {
  useLayoutEffect(() => {
    // Same code as in the HTML below; it does nothing if it has already run.
    new Function(script)();
  }, []);

  return <div hidden dangerouslySetInnerHTML={{ __html: `<script>${script}</script>` }} />;
}
