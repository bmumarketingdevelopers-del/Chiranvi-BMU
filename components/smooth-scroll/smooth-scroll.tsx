"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

/*
  Smooth scrolling for the whole site (wraps every page in app/layout.tsx), using Lenis with the same
  settings as cleverln.com:
    lerp 0.08          - each frame the page moves 8% of the way to where you scrolled, so it glides
    wheelMultiplier 0.9 - each mouse-wheel step scrolls a little less, for a calmer feel
    anchors            - links to a part of the page (e.g. the Refund "On this page" menu) glide there
    allowNestedScroll  - boxes that scroll on their own (search results, pop-ups) keep scrolling normally
  Phones keep their own swipe scrolling (Lenis only smooths mouse wheel and trackpad by default).
  Pop-ups and inner scroll areas are marked with data-lenis-prevent so the page behind does not move.
  Visitors who prefer less motion get normal scrolling.
*/

const smoothScrollOptions = {
  lerp: 0.08,
  wheelMultiplier: 0.9,
  anchors: true,
  allowNestedScroll: true,
  stopInertiaOnNavigate: true,
};

function subscribeToReducedMotion(onChange: () => void) {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotionQuery.addEventListener("change", onChange);
  return () => reducedMotionQuery.removeEventListener("change", onChange);
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  // Off until the page runs in the browser (and for reduced motion).
  const isSmoothScrollOn = useSyncExternalStore(
    subscribeToReducedMotion,
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  return (
    <>
      {isSmoothScrollOn && <ReactLenis root options={smoothScrollOptions} />}
      {children}
    </>
  );
}
