/**
 * Loads the shared SmartRetry cookie-consent bundle and adds the footer Legal
 * section.
 *
 * The banner, the Cookie preferences dialog and consent-gated Clarity + Zoho
 * SalesIQ all come from one framework-free bundle served by the marketing site
 * (marketing.website-app: src/bundles/consent, published at
 * /consent/v1/consent.js). The marketing site loads the same file, so the two
 * surfaces render one implementation and can't drift apart (#444).
 *
 * Mintlify loads every .js file in the content directory on all pages, after
 * the page becomes interactive. Raw <script> tags are not supported in MDX, so
 * the bundle's <script> tag is injected from here.
 *
 * The docs are served from https://www.smartretry.com/docs, the same origin as
 * the marketing site, so Cloudflare Zaraz's consent state (the `zaraz-consent`
 * cookie and window.zaraz.consent API) is shared across both.
 *
 * Purpose IDs and widget IDs are hardcoded because Mintlify has no build step
 * and no env vars. They must stay in sync with marketing-website-app's
 * NEXT_PUBLIC_ZARAZ_PURPOSE_ANALYTICS, NEXT_PUBLIC_ZARAZ_PURPOSE_ADVERTISING,
 * NEXT_PUBLIC_CLARITY_ID, and NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_CODE.
 */
(function () {
  var BUNDLE_SRC = "https://www.smartretry.com/consent/v1/consent.js";

  function loadConsentBundle() {
    if (document.querySelector('script[src="' + BUNDLE_SRC + '"]')) return;
    var script = document.createElement("script");
    script.src = BUNDLE_SRC;
    script.async = true;
    script.dataset.analyticsPurpose = "zQrb";
    script.dataset.advertisingPurpose = "KAqF";
    script.dataset.clarityId = "vsl61vxskh";
    script.dataset.salesiqWidgetCode =
      "siqbf2820ce0c5e80da008120c8e53c07f1a15c4160c69e7618704edfb1a9db38ca";
    // Mintlify's theme font isn't Poppins; the bundle's banner and dialog are.
    script.dataset.loadFont = "true";
    document.head.appendChild(script);
  }

  var STYLE_ID = "sr-footer-legal-style";
  var STYLE = [
    // Footer Legal block. Colors are inherited from the Mintlify footer so it
    // stays readable on light and dark themes. Sizes mirror marketing's footer.
    "#sr-footer-legal{flex-basis:100%;display:flex;flex-direction:column;gap:8px}",
    "#sr-footer-legal-title{margin:0;display:flex;align-items:center;gap:4px;font-size:16px;line-height:24px;font-weight:600}",
    "#sr-footer-legal ul{margin:0;padding:0;list-style:none}",
    "#sr-footer-legal li{margin:0;padding:0}",
    ".sr-footer-legal-link{display:inline-flex;align-items:center;min-height:44px;padding:10px 0;margin:0;border:0;background:transparent;font:inherit;font-size:16px;line-height:24px;font-weight:500;color:inherit;text-decoration:none;cursor:pointer}",
    ".sr-footer-legal-link:hover{text-decoration:underline;text-underline-offset:2px}",
    "@media(min-width:768px){#sr-footer-legal-title,.sr-footer-legal-link{font-size:12px;line-height:16px}}",
  ].join("");

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "text") node.textContent = attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  // ---------------------------------------------------------------------
  // Footer Legal section (mirrors the Legal column of marketing's footer)
  // ---------------------------------------------------------------------

  var FOOTER_LEGAL_ID = "sr-footer-legal";
  var SITE_ORIGIN = "https://www.smartretry.com";
  var LEGAL_LINKS = [
    { label: "Privacy Policy", href: SITE_ORIGIN + "/privacy-policy" },
    { label: "Terms of Use", href: SITE_ORIGIN + "/terms-of-use" },
    { label: "Accessibility", href: SITE_ORIGIN + "/accessibility-statement" },
    { label: "Security", href: SITE_ORIGIN + "/security" },
  ];

  function buildFooterLegal() {
    var items = LEGAL_LINKS.map(function (link) {
      return el("li", {}, [
        el("a", { class: "sr-footer-legal-link", href: link.href, text: link.label }),
      ]);
    });
    var cookieBtn = el("button", {
      type: "button",
      class: "sr-footer-legal-link",
      text: "Cookie Preferences",
    });
    cookieBtn.addEventListener("click", function () {
      if (window.SRConsent) window.SRConsent.open();
    });
    items.push(el("li", {}, [cookieBtn]));

    return el("div", { id: FOOTER_LEGAL_ID }, [
      el("p", { id: "sr-footer-legal-title", text: "📄 Legal" }),
      el("ul", {}, items),
    ]);
  }

  // Mintlify renders the footer client-side and re-renders it on navigation,
  // so the block is re-attached whenever it goes missing. It goes inside the
  // socials row (full width, so it wraps below the icons) to avoid moving any
  // node Mintlify owns.
  function ensureFooterLegal() {
    if (document.getElementById(FOOTER_LEGAL_ID)) return;
    var socials = document.querySelector("#footer > div");
    if (socials) socials.appendChild(buildFooterLegal());
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------

  loadConsentBundle();
  injectStyle();

  ensureFooterLegal();
  new MutationObserver(ensureFooterLegal).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
