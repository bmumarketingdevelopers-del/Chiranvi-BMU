"use client";

import { useState } from "react";
import styles from "./admin-date-range-picker.module.css";

/*
  "Custom range" calendar on the Chiranvi Panel dashboard, in the same style as the delivery calendar's
  month picker on the account Subscription page (components/account/subscription/delivery-week-picker.tsx):
  month name with arrows, M T W T F S S, today with a yellow ring, the chosen days shaded green.
  Click the first day, then the last day: the range is chosen and the calendar closes. Clicking a day
  before the first one starts again from that day. Days after today cannot be chosen, unless
  allowFutureDays is set (Coupons & offers: when a coupon is valid, which runs into the future).
*/

const weekdayInitials = ["M", "T", "W", "T", "F", "S", "S"];

function startOfDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(date: Date, numberOfDays: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + numberOfDays);
  return shifted;
}

// Monday of the week the date is in
function getMondayOfWeek(date: Date) {
  return addDays(startOfDay(date), -((date.getDay() + 6) % 7));
}

export default function AdminDateRangePicker({
  rangeFrom,
  rangeTo,
  today,
  onChooseRange,
  allowFutureDays = false,
}: {
  rangeFrom: Date;
  rangeTo: Date;
  today: Date;
  onChooseRange: (from: Date, to: Date) => void;
  allowFutureDays?: boolean;
}) {
  const todayStart = startOfDay(today);
  // First day of the month shown (the month of the range's last day)
  const [shownMonth, setShownMonth] = useState(() => new Date(rangeTo.getFullYear(), rangeTo.getMonth(), 1));
  // The first day clicked, waiting for the last day (null when no choice is in progress)
  const [pendingFrom, setPendingFrom] = useState<Date | null>(null);
  // While choosing: the day under the pointer, so the range previews as it will be
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  const lastDayOfMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let day = getMondayOfWeek(shownMonth); day <= lastDayOfMonth || days.length % 7 !== 0; day = addDays(day, 1)) {
    days.push(day);
  }

  // The range shaded on screen: the one being chosen (with the hovered day), or the chosen one
  const shownFrom = pendingFrom ?? startOfDay(rangeFrom);
  const shownTo = pendingFrom ? (hoveredDay && hoveredDay >= pendingFrom ? hoveredDay : pendingFrom) : startOfDay(rangeTo);

  function chooseDay(day: Date) {
    if (!pendingFrom || day < pendingFrom) {
      setPendingFrom(day);
      return;
    }
    onChooseRange(pendingFrom, day);
    setPendingFrom(null);
  }

  return (
    <div role="dialog" aria-label="Choose a date range" className={styles["admin-range-calendar"]}>
      <div className={styles["admin-range-calendar-month-row"]}>
        <button
          type="button"
          aria-label="Previous month"
          className={styles["admin-range-calendar-arrow"]}
          onClick={() => setShownMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p className={styles["admin-range-calendar-month-name"]}>
          {shownMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          className={styles["admin-range-calendar-arrow"]}
          disabled={!allowFutureDays && lastDayOfMonth >= todayStart}
          onClick={() => setShownMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className={styles["admin-range-calendar-weekdays"]} aria-hidden="true">
        {weekdayInitials.map((initial, index) => (
          <span key={index}>{initial}</span>
        ))}
      </div>

      <div className={styles["admin-range-calendar-days"]} onPointerLeave={() => setHoveredDay(null)}>
        {days.map((day) => {
          const isInShownMonth = day.getMonth() === shownMonth.getMonth();
          const isFuture = !allowFutureDays && day > todayStart;
          const isStart = day.getTime() === shownFrom.getTime();
          const isEnd = day.getTime() === shownTo.getTime();
          const isInRange = day >= shownFrom && day <= shownTo;
          return (
            <button
              key={day.toDateString()}
              type="button"
              disabled={isFuture}
              aria-pressed={isInRange}
              aria-label={day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              className={`${styles["admin-range-calendar-day"]} ${isInShownMonth ? "" : styles["admin-range-calendar-day-other-month"]} ${
                isInRange ? styles["admin-range-calendar-day-in-range"] : ""
              } ${isStart ? styles["admin-range-calendar-day-start"] : ""} ${isEnd ? styles["admin-range-calendar-day-end"] : ""} ${
                day.getTime() === todayStart.getTime() ? styles["admin-range-calendar-day-today"] : ""
              }`}
              onPointerEnter={() => pendingFrom && setHoveredDay(day)}
              onClick={() => chooseDay(day)}
            >
              <span>{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      <p className={styles["admin-range-calendar-hint"]}>
        {pendingFrom ? "Now choose the last day" : "Choose the first day, then the last day"}
      </p>
    </div>
  );
}
