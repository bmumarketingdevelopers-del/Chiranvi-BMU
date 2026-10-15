/*
  The landing page's zoom and layout script, shared by every page that uses the landing page's
  navigation bar and phone layout (the home page and the cart page). Run by landing-zoom-and-layout-runner.tsx.
*/

/*
  Runs in the browser before the hero is drawn, and again on every resize or zoom.
  CSS alone can't tell browser zoom apart from a smaller screen, so this script:
  - works out the zoom since the page loaded (from the change in devicePixelRatio),
  - stores the window size at that starting zoom in two CSS variables, so the hero keeps
    its size in CSS pixels and grows or shrinks with zoom like a normal website,
  - picks the layout: "mobile" for screens taller than wide, or when the zoomed-in design
    no longer fits the window width; "desktop" otherwise.
  Both are written to its own <style> tag in <head> (React leaves extra head tags alone), so the
  server-rendered HTML is never changed and React doesn't report a hydration mismatch.
*/
export const browserZoomAndLayoutScript = `(function () {
  // Already set up (for example after coming back to this page from another page): do nothing.
  if (document.querySelector("style[data-landing-zoom-and-layout]")) return;
  var zoomStyleElement = document.createElement("style");
  zoomStyleElement.setAttribute("data-landing-zoom-and-layout", "");
  document.head.appendChild(zoomStyleElement);
  var devicePixelRatioAtLoad = window.devicePixelRatio || 1;
  function updateZoomAndLayout() {
    var zoomSinceLoad = (window.devicePixelRatio || 1) / devicePixelRatioAtLoad;
    if (Math.abs(zoomSinceLoad - 1) < 0.02) zoomSinceLoad = 1;
    var widthAtStartingZoom = window.innerWidth * zoomSinceLoad;
    var heightAtStartingZoom = window.innerHeight * zoomSinceLoad;
    zoomStyleElement.textContent =
      ":root{--landing-viewport-width-at-starting-zoom:" + widthAtStartingZoom + "px;" +
      "--landing-viewport-height-at-starting-zoom:" + heightAtStartingZoom + "px}";
    var desktopDesignPixel = Math.min(widthAtStartingZoom / 1440, heightAtStartingZoom / 916);
    var isTallerThanWide = window.innerWidth <= window.innerHeight;
    var desktopDesignTooWide = window.innerWidth < 1440 * desktopDesignPixel * 0.8;
    zoomStyleElement.setAttribute("data-landing-layout", isTallerThanWide || desktopDesignTooWide ? "mobile" : "desktop");
  }
  updateZoomAndLayout();
  window.addEventListener("resize", updateZoomAndLayout);
})();`;
