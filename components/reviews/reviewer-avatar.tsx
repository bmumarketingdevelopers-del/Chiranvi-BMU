import type { ReviewerAvatarLook } from "./customer-reviews-data";

/*
  Illustrated reviewer portrait (head and shoulders on a soft round background), used in place of
  a photo because the reviews are placeholders: a drawing never suggests a real person wrote them.
  South Indian look: brown skin tones, black hair (long hair or a bun with a bindi for women,
  short hair and sometimes a moustache for men). Drawn to fill whatever circle it is placed in.
*/

const hairColour = "#1c1410";

export default function ReviewerAvatar({ look }: { look: ReviewerAvatarLook }) {
  const isFemale = look.gender === "female";
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
      <circle cx="24" cy="24" r="24" fill={look.backgroundColour} />

      {/* Long hair falls behind the shoulders */}
      {isFemale && look.hairStyle === "long" && (
        <path d="M12.5 22c0-8 5-12.5 11.5-12.5S35.5 14 35.5 22v14h-23Z" fill={hairColour} />
      )}

      {/* Shoulders and neck */}
      <path d="M8 48c0-8.5 7-13.5 16-13.5S40 39.5 40 48Z" fill={look.clothesColour} />
      <path d="M20.5 30h7v6.5a3.5 3.5 0 0 1-7 0Z" fill={look.skinTone} />

      {/* Face and ears */}
      <ellipse cx="24" cy="22.5" rx="8" ry="9" fill={look.skinTone} />
      <ellipse cx="16.2" cy="23.5" rx="1.4" ry="2" fill={look.skinTone} />
      <ellipse cx="31.8" cy="23.5" rx="1.4" ry="2" fill={look.skinTone} />

      {/* Hair on top */}
      {isFemale ? (
        <>
          <path
            d="M15.6 21.5c.2-6.4 3.8-9.8 8.4-9.8s8.2 3.4 8.4 9.8c-2.6-3.6-5.4-5-8.4-5.2-3 .2-5.8 1.6-8.4 5.2Z"
            fill={hairColour}
          />
          {look.hairStyle === "bun" && <circle cx="24" cy="10.8" r="3.6" fill={hairColour} />}
        </>
      ) : (
        <path
          d="M15.8 20.5c0-5.8 3.6-8.8 8.2-8.8s8.2 3 8.2 8.8c-1.4-2.6-3.8-4-8.2-4.1-4.4.1-6.8 1.5-8.2 4.1Z"
          fill={hairColour}
        />
      )}

      {/* Eyes, smile */}
      <circle cx="21" cy="23" r="0.9" fill={hairColour} />
      <circle cx="27" cy="23" r="0.9" fill={hairColour} />
      <path d="M21.4 27.4c1.6 1.4 3.6 1.4 5.2 0" fill="none" stroke="#5a2e1c" strokeWidth="0.9" strokeLinecap="round" />

      {/* Bindi for women, moustache for some men */}
      {isFemale && <circle cx="24" cy="19.4" r="0.85" fill="#c0392b" />}
      {look.hasMoustache && <path d="M21 26.1c1-.7 2.1-.7 3 0 .9-.7 2-.7 3 0-1 .9-5 .9-6 0Z" fill={hairColour} />}
    </svg>
  );
}
