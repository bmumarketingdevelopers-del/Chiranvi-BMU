import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./join-community-section.module.css";

/*
  "Join the Chiranvi Community" section, the main part of the /community page (design, 1440 x 967 frame):
  two half-circle arcs with eight farm photos travelling along them, three numbers under the arcs
  (5K+ community members, 20K+ families served, 1x free farm visit), then the heading, a short
  description and the "Join Now" button. "Join Now" has no action yet (community sign-up comes later).
  The photos already have their rounded / oval shapes (transparent corners), so they are shown as they are.
*/

/*
  Photos travelling along the two half circles (the arcs stay half circles):
  - orange (outer) arc: clockwise, from the left end over the top to the right end;
  - grey (inner) arc: anticlockwise, from the right end over the top to the left end.
  Four photos per arc, evenly spaced; order is their place from the start of the arc (1 = nearest the
  start, 4 = nearest the end). When a photo sinks into the bottom line at the end, the same photo rises
  out of the line at the start at the same moment (no gap), so the order goes
  1 2 3 4 -> 4 1 2 3 -> 3 4 1 2 -> 2 3 4 1 -> 1 2 3 4. For that, every photo is drawn twice: the second
  copy (decorative, hidden from screen readers) runs half a cycle behind the first.
  displayWidth is the photo width in design pixels; the height follows the photo.
*/
const communityPhotos = [
  // Orange (outer) arc, clockwise
  {
    file: "woman-in-orange-saree-with-calf.webp",
    alt: "A woman in an orange saree with a calf",
    width: 504,
    height: 508,
    arc: "outer",
    order: 1,
    displayWidth: 127,
  },
  {
    file: "puppies-on-resting-cow.webp",
    alt: "Puppies resting on a calf",
    width: 488,
    height: 356,
    arc: "outer",
    order: 2,
    displayWidth: 123,
  },
  {
    file: "hands-stroking-calf.webp",
    alt: "Hands stroking a calf",
    width: 384,
    height: 432,
    arc: "outer",
    order: 3,
    displayWidth: 97,
  },
  {
    file: "woman-hugging-white-calf-oval.webp",
    alt: "A woman hugging a white calf",
    width: 408,
    height: 544,
    arc: "outer",
    order: 4,
    displayWidth: 103,
  },
  // Grey (inner) arc, anticlockwise
  {
    file: "grey-cow-and-calf-in-pen.webp",
    alt: "A grey cow and her calf",
    width: 376,
    height: 372,
    arc: "inner",
    order: 1,
    displayWidth: 97,
  },
  {
    file: "girl-with-white-cow.webp",
    alt: "A girl with a white desi cow",
    width: 424,
    height: 532,
    arc: "inner",
    order: 2,
    displayWidth: 106,
  },
  {
    file: "woman-with-red-calf.webp",
    alt: "A woman petting a red calf",
    width: 408,
    height: 472,
    arc: "inner",
    order: 3,
    displayWidth: 103,
  },
  {
    file: "child-with-calf.webp",
    alt: "A child laughing with a calf",
    width: 436,
    height: 488,
    arc: "inner",
    order: 4,
    displayWidth: 110,
  },
];

/*
  Portals at the four ends of the arcs (left and right end of the orange arc and of the grey arc).
  Each time a photo sinks into the line or rises out of it, a dash forms on the line, opens like a
  portal with light shining up, then closes again. Orange on the orange arc, grey on the grey arc.
*/
const arcPortals = [
  { arc: "outer", side: "left" },
  { arc: "outer", side: "right" },
  { arc: "inner", side: "left" },
  { arc: "inner", side: "right" },
];

const communityNumbers = [
  { value: "5K", sign: "+", label: "Community members" },
  { value: "20K", sign: "+", label: "Families served" },
  { value: "1", sign: "×", label: "Free farm visit" },
];

export default function JoinCommunitySection() {
  return (
    <section id="join-community" className={styles["join-community-section"]} aria-labelledby="join-community-heading">
      {/* Arcs, photos and numbers, laid out like the 1440-wide design */}
      <div className={styles["join-community-collage"]}>
        <span className={`${styles["join-community-arc"]} ${styles["join-community-arc-outer"]}`} aria-hidden="true" />
        <span className={`${styles["join-community-arc"]} ${styles["join-community-arc-inner"]}`} aria-hidden="true" />

        {/*
          Each photo rides on a holder that turns around the arcs' centre (see the CSS).
          Copy 0 and copy 1 of the same photo take turns: one sinks at the end while the other rises at the start.
        */}
        {communityPhotos.flatMap((photo) =>
          [0, 1].map((photoCopy) => (
            <span
              key={`${photo.file}-${photoCopy}`}
              aria-hidden={photoCopy === 1 ? true : undefined}
              className={`${styles["join-community-photo-holder"]} ${styles[`join-community-photo-holder-${photo.arc}`]} ${
                photoCopy === 1 ? styles["join-community-photo-holder-second-copy"] : ""
              }`}
              style={{ "--photo-order": photo.order, "--photo-copy": photoCopy } as CSSProperties}
            >
              <Image
                src={`/images/community/${photo.file}`}
                alt={photoCopy === 1 ? "" : photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 600px) 60px, 140px"
                className={styles["join-community-photo"]}
                style={{ "--photo-width": photo.displayWidth } as CSSProperties}
              />
            </span>
          )),
        )}

        {/* Portals: in front of the photos, so a photo looks like it goes into / comes out of the light */}
        {arcPortals.map((arcPortal) => (
          <span
            key={`${arcPortal.arc}-${arcPortal.side}`}
            aria-hidden="true"
            className={`${styles["join-community-portal"]} ${styles[`join-community-portal-${arcPortal.arc}`]} ${
              styles[`join-community-portal-${arcPortal.side}`]
            }`}
          >
            <span className={styles["join-community-portal-light"]} />
            <span className={styles["join-community-portal-opening"]} />
            <span className={styles["join-community-portal-dash"]} />
          </span>
        ))}
      </div>

      {/*
        Numbers: outside the picture area (which hides everything below the line), pulled up between
        the arcs on desktop, just under the line on phones.
      */}
      <dl className={styles["join-community-numbers"]}>
        {communityNumbers.map((communityNumber) => (
          <div key={communityNumber.label} className={styles["join-community-number"]}>
            <dt className={styles["join-community-number-label"]}>{communityNumber.label}</dt>
            <dd className={styles["join-community-number-value"]}>
              {communityNumber.value}
              <span className={styles["join-community-number-sign"]}>{communityNumber.sign}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className={styles["join-community-text"]}>
        <h2 id="join-community-heading" className={styles["join-community-heading"]}>
          <span className={styles["join-community-heading-first-line"]}>Join the Chiranvi Community &amp;</span>
          <span className={styles["join-community-heading-second-line"]}>
            get a <strong className={styles["join-community-heading-highlight"]}>free entry visit</strong> to our farm
          </span>
        </h2>
        <p className={styles["join-community-description"]}>
          Become a member and join the community, we&apos;ll send you an entry pass to Chiranvi Farms.
          <br />
          Walk the pastures, meet our desi cows and see where your milk comes from.
        </p>
        {/* No action yet: the community sign-up comes later */}
        <button type="button" className={styles["join-community-button"]}>
          Join Now
        </button>
      </div>
    </section>
  );
}
