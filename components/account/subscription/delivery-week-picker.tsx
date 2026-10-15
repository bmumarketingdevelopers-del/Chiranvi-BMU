"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./delivery-week-picker.module.css";

/*
  Small month calendar that opens under the week button of the delivery calendar.
  Weeks run Monday to Sunday, one row each; clicking anywhere on a row picks that whole week
  (only whole weeks can be chosen). The month arrows move between months; today has a ring and the
  chosen week is shaded green. Escape or a click outside closes it.
*/

const weekdayInitials = ["M", "T", "W", "T", "F", "S", "S"];

// Monday (00:00) of the week that the date is in.
export function getMondayOfWeek(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function addDays(date: Date, numberOfDays: number) {
  const shiftedDate = new Date(date);
  shiftedDate.setDate(shiftedDate.getDate() + numberOfDays);
  return shiftedDate;
}

// Monday 12 Oct 2026 -> "12 – 18 Oct 2026"; across months "28 Sep – 4 Oct 2026"; across years in full.
export function formatWeekRange(monday: Date) {
  const sunday = addDays(monday, 6);
  const dayAndMonth = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${dayAndMonth(monday)} ${monday.getFullYear()} – ${dayAndMonth(sunday)} ${sunday.getFullYear()}`;
  }
  if (monday.getMonth() !== sunday.getMonth()) {
    return `${dayAndMonth(monday)} – ${dayAndMonth(sunday)} ${sunday.getFullYear()}`;
  }
  return `${monday.getDate()} – ${dayAndMonth(sunday)} ${sunday.getFullYear()}`;
}

export default function DeliveryWeekPicker({
  selectedMonday,
  today,
  onSelectWeek,
  onClose,
}: {
  selectedMonday: Date;
  today: Date;
  onSelectWeek: (monday: Date) => void;
  onClose: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  // First day of the month shown (starts at the month of the chosen week's Thursday, so a week
  // that spans two months opens on the month most of it is in).
  const [shownMonth, setShownMonth] = useState(() => {
    const thursday = addDays(selectedMonday, 3);
    return new Date(thursday.getFullYear(), thursday.getMonth(), 1);
  });

  // Close on Escape or a click outside the picker (the week button toggles it itself).
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function closeOnOutsideClick(event: PointerEvent) {
      const clickedNode = event.target as Node;
      const weekButton = pickerRef.current?.parentElement?.querySelector("[aria-haspopup]");
      if (!pickerRef.current?.contains(clickedNode) && !weekButton?.contains(clickedNode)) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [onClose]);

  // The Mondays of every week that has a day in the shown month.
  const lastDayOfMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 0);
  const weekMondays: Date[] = [];
  for (let monday = getMondayOfWeek(shownMonth); monday <= lastDayOfMonth; monday = addDays(monday, 7)) {
    weekMondays.push(monday);
  }

  function showMonth(monthChange: 1 | -1) {
    setShownMonth((month) => new Date(month.getFullYear(), month.getMonth() + monthChange, 1));
  }

  return (
    <div ref={pickerRef} role="dialog" aria-label="Choose a week" className={styles["week-picker"]}>
      <div className={styles["week-picker-month-row"]}>
        <button
          type="button"
          aria-label="Previous month"
          className={styles["week-picker-month-arrow"]}
          onClick={() => showMonth(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p className={styles["week-picker-month-name"]}>
          {shownMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          className={styles["week-picker-month-arrow"]}
          onClick={() => showMonth(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className={styles["week-picker-weekday-row"]} aria-hidden="true">
        {weekdayInitials.map((weekdayInitial, dayIndex) => (
          <span key={dayIndex}>{weekdayInitial}</span>
        ))}
      </div>

      <ul className={styles["week-picker-weeks"]}>
        {weekMondays.map((monday) => {
          const isSelectedWeek = monday.getTime() === selectedMonday.getTime();
          return (
            <li key={monday.toDateString()}>
              <button
                type="button"
                aria-pressed={isSelectedWeek}
                aria-label={`Week of ${formatWeekRange(monday)}`}
                className={`${styles["week-picker-week"]} ${isSelectedWeek ? styles["week-picker-week-selected"] : ""}`}
                onClick={() => onSelectWeek(monday)}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const date = addDays(monday, dayIndex);
                  const isInShownMonth = date.getMonth() === shownMonth.getMonth();
                  const isToday = date.getTime() === today.getTime();
                  return (
                    <span
                      key={dayIndex}
                      className={`${styles["week-picker-day"]} ${isInShownMonth ? "" : styles["week-picker-day-other-month"]} ${
                        isToday ? styles["week-picker-day-today"] : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  );
                })}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
