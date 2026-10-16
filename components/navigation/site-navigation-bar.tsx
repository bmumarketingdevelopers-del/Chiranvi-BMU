"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Poppins } from "next/font/google";
import { rememberPageAfterLogin, useIsLoggedIn } from "@/components/login/login-status";
import { countCartPacks, useCartItems } from "@/store/cart-store";
import { findCatalogueItems } from "./search-catalogue";
import styles from "./site-navigation-bar.module.css";

// Loaded here as well so the bar keeps its font on pages that don't load Poppins themselves.
const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

// iconPaths are only shown in the mobile bottom bar; mobileLabel is the shorter text used there.
const navigationLinks = [
  { href: "/", label: "Home", mobileLabel: "Home", iconPaths: ["M3 11 12 4l9 7", "M5 10v10h14V10"] },
  {
    href: "/products",
    label: "Products",
    mobileLabel: "Products",
    iconPaths: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  },
  {
    href: "#",
    label: "Offers",
    mobileLabel: "Offers",
    iconPaths: ["M3 12V4h8l10 10-8 8L3 12Z", "M7.5 7.5h.01"],
  },
  {
    href: "/community",
    label: "Join Community",
    mobileLabel: "Community",
    iconPaths: [
      "M6 11a3 3 0 1 0 0-.01",
      "M3 20a5 5 0 0 1 10 0",
      "M16 10a2.5 2.5 0 1 0 0-.01",
      "M14.5 15a4.5 4.5 0 0 1 6.5 5",
    ],
  },
];

// Sent when the cart icon is clicked while already on the cart page (the cart page shakes its trolley).
export const CART_ICON_CLICKED_ON_CART_PAGE_EVENT = "cart-icon-clicked-on-cart-page";

export default function SiteNavigationBar() {
  const isLoggedIn = useIsLoggedIn();
  const pathname = usePathname();
  // Number of packs in the cart, shown on the cart badge.
  const cartItemCount = countCartPacks(useCartItems());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  // Phone layout only: the menu (three lines button) that holds the page links and Log in.
  const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
  const phoneMenuAreaRef = useRef<HTMLDivElement>(null);
  const phoneMenuLinksRef = useRef<HTMLElement>(null);

  // While the phone menu is open: close it on Escape or a tap outside the menu and its button.
  useEffect(() => {
    if (!isPhoneMenuOpen) return;
    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsPhoneMenuOpen(false);
    }
    function closeMenuOnOutsideTap(event: PointerEvent) {
      const tappedNode = event.target as Node;
      const isInsideMenu =
        phoneMenuAreaRef.current?.contains(tappedNode) || phoneMenuLinksRef.current?.contains(tappedNode);
      if (!isInsideMenu) setIsPhoneMenuOpen(false);
    }
    // Any tapped menu link closes the menu. Listened for before other handlers, because the phone
    // login sheet stops taps on the Log in link from reaching the menu itself.
    function closeMenuOnLinkTap(event: MouseEvent) {
      if ((event.target as Element).closest?.("a") && phoneMenuLinksRef.current?.contains(event.target as Node)) {
        setIsPhoneMenuOpen(false);
      }
    }
    window.addEventListener("keydown", closeMenuOnEscape);
    document.addEventListener("pointerdown", closeMenuOnOutsideTap);
    document.addEventListener("click", closeMenuOnLinkTap, true);
    return () => {
      window.removeEventListener("keydown", closeMenuOnEscape);
      document.removeEventListener("pointerdown", closeMenuOnOutsideTap);
      document.removeEventListener("click", closeMenuOnLinkTap, true);
    };
  }, [isPhoneMenuOpen]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Search text and results (from search-catalogue.ts); the highlighted result opens on Enter.
  const [searchText, setSearchText] = useState("");
  const [highlightedResultIndex, setHighlightedResultIndex] = useState(0);
  const searchResults = findCatalogueItems(searchText);
  // While true, the search box plays its closing animation before it is removed.
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const searchCloseTimerRef = useRef<number | undefined>(undefined);

  // Close the search box smoothly: play the closing animation (260ms), then remove it.
  const closeSearch = useCallback(() => {
    if (searchCloseTimerRef.current !== undefined) return;
    setIsSearchClosing(true);
    searchCloseTimerRef.current = window.setTimeout(() => {
      setIsSearchOpen(false);
      setIsSearchClosing(false);
      searchCloseTimerRef.current = undefined;
    }, 260);
  }, []);

  // While the small search box is open: focus it, and close it on Escape or a click outside it.
  useEffect(() => {
    if (!isSearchOpen) return;

    searchInputRef.current?.focus();

    function closeSearchOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeSearch();
    }
    function closeSearchOnOutsideClick(event: PointerEvent) {
      if (!searchAreaRef.current?.contains(event.target as Node)) closeSearch();
    }
    window.addEventListener("keydown", closeSearchOnEscape);
    document.addEventListener("pointerdown", closeSearchOnOutsideClick);

    return () => {
      window.removeEventListener("keydown", closeSearchOnEscape);
      document.removeEventListener("pointerdown", closeSearchOnOutsideClick);
    };
  }, [isSearchOpen, closeSearch]);

  return (
    <header
      className={`${poppinsFont.className} ${styles["site-navigation-bar"]} ${
        isSearchOpen ? styles["site-navigation-bar-search-open"] : ""
      }`}
    >
      <Link href="/" className={styles["site-navigation-bar-logo-link"]}>
        <Image
          src="/images/brand/chiranvi-farm-logo.webp"
          alt="Chiranvi Farm"
          width={516}
          height={240}
          className={styles["site-navigation-bar-logo-image"]}
          preload
        />
      </Link>

      {/*
        Page links. Desktop: a row in the middle of the bar. Phone: hidden until the three lines
        button is tapped, then shown as a small menu below the bar (with Log in added).
      */}
      <nav
        id="site-navigation-links"
        ref={phoneMenuLinksRef}
        aria-label="Main navigation"
        className={`${styles["site-navigation-bar-links-list"]} ${
          isPhoneMenuOpen ? styles["site-navigation-bar-links-list-open"] : ""
        }`}
      >
        {navigationLinks.map((navigationLink) => {
          // The page you are on: green with a gold underline (design). Home is left plain on the landing page.
          const isCurrentPage = navigationLink.href.length > 1 && pathname.startsWith(navigationLink.href);
          return (
            <Link
              key={navigationLink.label}
              href={navigationLink.href}
              aria-current={isCurrentPage ? "page" : undefined}
              className={`${styles["site-navigation-bar-link"]} ${
                isCurrentPage ? styles["site-navigation-bar-link-current"] : ""
              }`}
            >
              <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-link-mobile-icon"]} aria-hidden="true">
                {navigationLink.iconPaths.map((iconPath) => (
                  <path key={iconPath} d={iconPath} />
                ))}
              </svg>
              <span className={styles["site-navigation-bar-link-desktop-label"]}>{navigationLink.label}</span>
              <span className={styles["site-navigation-bar-link-mobile-label"]}>{navigationLink.mobileLabel}</span>
            </Link>
          );
        })}
        {/* Phone menu: "Log in" (then the account dashboard), or "My account" once logged in. */}
        <Link
          href={isLoggedIn ? "/account" : "/login"}
          className={`${styles["site-navigation-bar-link"]} ${styles["site-navigation-bar-link-phone-menu-only"]}`}
          onPointerDown={() => {
            if (!isLoggedIn) rememberPageAfterLogin("/account");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isLoggedIn) rememberPageAfterLogin("/account");
          }}
        >
          <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-link-mobile-icon"]} aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <span>{isLoggedIn ? "My account" : "Log in"}</span>
        </Link>
      </nav>

      <div className={styles["site-navigation-bar-icon-group"]}>
        {/* Search icon; when clicked, a small search box opens right here (just below the bar on phones). */}
        <div ref={searchAreaRef} className={styles["site-navigation-bar-search-area"]}>
          <button
            type="button"
            aria-label="Open search"
            aria-expanded={isSearchOpen}
            className={styles["site-navigation-bar-icon-button"]}
            onClick={() => {
              setSearchText("");
              setHighlightedResultIndex(0);
              setIsSearchOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-icon"]} aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </button>

          {isSearchOpen && (
            <form
              role="search"
              aria-label="Search products"
              className={`${styles["site-navigation-bar-search-box"]} ${
                isSearchClosing ? styles["site-navigation-bar-search-box-closing"] : ""
              }`}
              onSubmit={(event) => {
                // Enter opens the highlighted result (clicking its link, so the phone login sheet can catch it).
                event.preventDefault();
                document.getElementById(`site-search-result-${highlightedResultIndex}`)?.click();
              }}
            >
              <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-search-box-icon"]} aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search products"
                aria-label="Search products"
                role="combobox"
                aria-expanded={searchText.trim() !== ""}
                aria-controls="site-search-results"
                aria-activedescendant={
                  searchResults.length > 0 ? `site-search-result-${highlightedResultIndex}` : undefined
                }
                autoComplete="off"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setHighlightedResultIndex(0);
                }}
                onKeyDown={(event) => {
                  if (searchResults.length === 0) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlightedResultIndex((index) => (index + 1) % searchResults.length);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlightedResultIndex((index) => (index - 1 + searchResults.length) % searchResults.length);
                  }
                }}
                className={styles["site-navigation-bar-search-box-input"]}
              />
              <button
                type="button"
                aria-label="Close search"
                className={styles["site-navigation-bar-search-box-close-button"]}
                onClick={closeSearch}
              >
                <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-search-box-icon"]} aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>

              {/* Results list under the box, shown once something is typed */}
              {searchText.trim() !== "" && (
                <div className={styles["site-navigation-bar-search-results"]} data-lenis-prevent>
                  {searchResults.length === 0 ? (
                    <p className={styles["site-navigation-bar-search-no-results"]}>
                      No products found for “{searchText.trim()}”
                    </p>
                  ) : (
                    <ul id="site-search-results" role="listbox" aria-label="Search results">
                      {searchResults.map((catalogueItem, resultIndex) => (
                        <li key={catalogueItem.name} role="presentation">
                          <Link
                            id={`site-search-result-${resultIndex}`}
                            href="/login"
                            role="option"
                            aria-selected={resultIndex === highlightedResultIndex}
                            onMouseEnter={() => setHighlightedResultIndex(resultIndex)}
                            onClick={closeSearch}
                            className={`${styles["site-navigation-bar-search-result"]} ${
                              resultIndex === highlightedResultIndex
                                ? styles["site-navigation-bar-search-result-highlighted"]
                                : ""
                            }`}
                          >
                            <span className={styles["site-navigation-bar-search-result-image-area"]}>
                              <Image
                                src={catalogueItem.imageSource}
                                alt=""
                                width={catalogueItem.imageWidth}
                                height={catalogueItem.imageHeight}
                                sizes="40px"
                                className={styles["site-navigation-bar-search-result-image"]}
                              />
                            </span>
                            <span className={styles["site-navigation-bar-search-result-text"]}>
                              <span className={styles["site-navigation-bar-search-result-name"]}>
                                {catalogueItem.name}
                              </span>
                              <span className={styles["site-navigation-bar-search-result-label"]}>
                                {catalogueItem.label}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Always at the bottom of the box, also while the list scrolls */}
                  <Link
                    href="/products"
                    onClick={closeSearch}
                    className={styles["site-navigation-bar-search-view-all"]}
                  >
                    View all products
                  </Link>
                </div>
              )}
            </form>
          )}
        </div>

        {/*
          Logged in: the profile icon opens the account dashboard (shown in a green circle while there).
          Not logged in: login first; the dashboard is noted just before the click (pointer down / Enter),
          because on phones the login sheet takes over the click itself, and opens after logging in.
        */}
        <Link
          href={isLoggedIn ? "/account" : "/login"}
          aria-label={isLoggedIn ? "My account" : "Log in to my account"}
          className={`${styles["site-navigation-bar-icon-button"]} ${
            pathname.startsWith("/account") ? styles["site-navigation-bar-icon-button-current-page"] : ""
          }`}
          onPointerDown={() => {
            if (!isLoggedIn) rememberPageAfterLogin("/account");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isLoggedIn) rememberPageAfterLogin("/account");
          }}
        >
          <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-icon"]} aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </Link>

        {/*
          Not logged in: the cart leads to the login first; logging in then opens /cart.
          Logged in: opens /cart. Already on /cart: stays there and tells the cart page to shake its trolley.
        */}
        <Link
          href={isLoggedIn ? "/cart" : "/login"}
          aria-label={`Cart, ${cartItemCount} items`}
          className={styles["site-navigation-bar-icon-button"]}
          onPointerDown={() => {
            if (!isLoggedIn) rememberPageAfterLogin("/cart");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isLoggedIn) rememberPageAfterLogin("/cart");
          }}
          onClick={(event) => {
            if (!isLoggedIn || pathname !== "/cart") return;
            event.preventDefault();
            window.dispatchEvent(new Event(CART_ICON_CLICKED_ON_CART_PAGE_EVENT));
          }}
        >
          <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-icon"]} aria-hidden="true">
            <path d="M5 8h14l-1 13H6L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span className={styles["site-navigation-bar-cart-count-badge"]}>{cartItemCount}</span>
        </Link>

        {/* Phone layout only: three lines button that opens the menu with the other options */}
        <div ref={phoneMenuAreaRef} className={styles["site-navigation-bar-phone-menu-area"]}>
          <button
            type="button"
            aria-label={isPhoneMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isPhoneMenuOpen}
            aria-controls="site-navigation-links"
            className={styles["site-navigation-bar-icon-button"]}
            onClick={() => setIsPhoneMenuOpen((isOpen) => !isOpen)}
          >
            <svg viewBox="0 0 24 24" className={styles["site-navigation-bar-icon"]} aria-hidden="true">
              {isPhoneMenuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
