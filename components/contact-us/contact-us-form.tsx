"use client";

import { useState, type FormEvent } from "react";
import styles from "./contact-us-page.module.css";

/*
  "How can we help?" form on the Contact Us page: full name, phone, email, topic and message,
  then "Send message". Frontend only for now: nothing is sent anywhere yet; on send the form is
  cleared and a short thank-you line appears under the button.
*/

const contactTopics = ["Subscription", "Order or delivery", "Farm visit", "Bulk or B2B order", "Something else"];

export default function ContactUsForm() {
  const [isMessageSent, setIsMessageSent] = useState(false);

  function handleSendMessage(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    submitEvent.currentTarget.reset();
    setIsMessageSent(true);
  }

  return (
    <section className={styles["contact-us-form-section"]} aria-labelledby="contact-us-form-heading">
      <h2 id="contact-us-form-heading" className={styles["contact-us-form-heading"]}>
        How can we help?
      </h2>
      <p className={styles["contact-us-form-subheading"]}>Fill in the form and we&rsquo;ll get back to you shortly.</p>

      <form className={styles["contact-us-form"]} onSubmit={handleSendMessage} onChange={() => setIsMessageSent(false)}>
        <label className={styles["contact-us-form-field"]}>
          <span className={styles["contact-us-form-label"]}>Full name</span>
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            placeholder="Your name"
            required
            className={styles["contact-us-form-input"]}
          />
        </label>

        <label className={styles["contact-us-form-field"]}>
          <span className={styles["contact-us-form-label"]}>Phone number</span>
          <input
            type="tel"
            name="phoneNumber"
            autoComplete="tel"
            placeholder="+91"
            required
            className={styles["contact-us-form-input"]}
          />
        </label>

        <label className={styles["contact-us-form-field"]}>
          <span className={styles["contact-us-form-label"]}>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={styles["contact-us-form-input"]}
          />
        </label>

        <label className={styles["contact-us-form-field"]}>
          <span className={styles["contact-us-form-label"]}>I&rsquo;m writing about</span>
          <span className={styles["contact-us-form-select-wrapper"]}>
            <select name="topic" defaultValue="" required className={styles["contact-us-form-select"]}>
              <option value="" disabled>
                Select a topic
              </option>
              {contactTopics.map((contactTopic) => (
                <option key={contactTopic} value={contactTopic}>
                  {contactTopic}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" className={styles["contact-us-form-select-arrow"]} aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </label>

        <label className={`${styles["contact-us-form-field"]} ${styles["contact-us-form-field-wide"]}`}>
          <span className={styles["contact-us-form-label"]}>Message</span>
          <textarea
            name="message"
            placeholder="Tell us a little about what you need..."
            required
            className={`${styles["contact-us-form-input"]} ${styles["contact-us-form-message"]}`}
          />
        </label>

        <div className={styles["contact-us-form-actions"]}>
          <button type="submit" className={styles["contact-us-form-send-button"]}>
            Send message
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
          <p className={styles["contact-us-form-sent-note"]} role="status">
            {isMessageSent ? "Thank you! We’ll get back to you shortly." : ""}
          </p>
        </div>
      </form>
    </section>
  );
}
