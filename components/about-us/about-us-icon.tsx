import type { CSSProperties } from "react";
import styles from "./about-us-page.module.css";

/*
  Icons for the About Us page, all in one colour (the colour of the text around them, so each section
  can make them green, gold or dark just with CSS).
  - Icons from the design (cow, barn, leaf, flask, churn, shield) are the design's own pictures, used as
    a mask: the picture gives the shape and the CSS colour fills it.
  - The others (sun, drop, bottle, truck) are drawn here in the same thin, rounded line style.
  width / height: the icon's size in design pixels.
*/

const maskIconFiles = {
  cow: "/images/about-us/icon-desi-cow.webp",
  barn: "/images/about-us/icon-farm-barn.webp",
  leaf: "/images/about-us/icon-leaf.webp",
  flask: "/images/about-us/icon-no-chemicals-flask.webp",
  churn: "/images/about-us/icon-butter-churn.webp",
  shield: "/images/about-us/icon-shield-check.webp",
};

const drawnIconPaths = {
  sun: [
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M12 2.5v2",
    "M12 19.5v2",
    "M2.5 12h2",
    "M19.5 12h2",
    "M5.3 5.3l1.4 1.4",
    "M17.3 17.3l1.4 1.4",
    "M5.3 18.7l1.4-1.4",
    "M17.3 6.7l1.4-1.4",
  ],
  drop: ["M12 3s6.5 7.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.2 12 3 12 3Z", "M10 17.2a2.6 2.6 0 0 0 2.4 1.3"],
  bottle: ["M7.5 3.5h9v3.2h-9z", "M8 6.7h8l.8 1.8v11.3a1.7 1.7 0 0 1-1.7 1.7H8.9a1.7 1.7 0 0 1-1.7-1.7V8.5Z", "M10 12.8h4", "M10 15.6h3"],
  truck: [
    "M2.5 6.5h11v9.5h-11z",
    "M13.5 9.5h4l3.5 3.5v3h-7.5",
    "M6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  ],
};

export type AboutUsIconName = keyof typeof maskIconFiles | keyof typeof drawnIconPaths;

export default function AboutUsIcon({ name, width, height }: { name: AboutUsIconName; width: number; height: number }) {
  const size = { "--about-us-icon-width": width, "--about-us-icon-height": height } as CSSProperties;

  if (name in maskIconFiles) {
    const file = maskIconFiles[name as keyof typeof maskIconFiles];
    return (
      <span
        className={styles["about-us-icon"]}
        style={{ ...size, maskImage: `url(${file})`, WebkitMaskImage: `url(${file})` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={styles["about-us-icon-drawn"]} style={size} aria-hidden="true">
      {drawnIconPaths[name as keyof typeof drawnIconPaths].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
