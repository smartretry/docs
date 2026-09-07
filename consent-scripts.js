/**
 * Cookie consent banner + consent-gated third-party scripts (Microsoft Clarity + Zoho SalesIQ).
 *
 * Mintlify loads every .js file in the content directory on all pages, after the
 * page becomes interactive. Raw <script> tags are not supported in MDX, so the
 * banner, the customize dialog, and both widgets are all injected programmatically
 * here.
 *
 * The docs are served from https://www.smartretry.com/docs, the same origin as
 * the marketing site, so Cloudflare Zaraz's consent state (the `zaraz-consent`
 * cookie and window.zaraz.consent API) is shared across both. A choice made on
 * either surface is respected on the other without re-prompting.
 *
 * This banner mirrors consent-banner/consent-customize-dialog/use-consent in
 * marketing-website-app: same events (zarazConsentAPIReady,
 * zarazConsentChoicesUpdated), same "zaraz-consent" cookie as the
 * has-user-chosen signal, same accept/reject/customize semantics, same copy,
 * same visual design (brand-dark surface, brand-pink actions, rounded-2xl
 * modal). Any visual or copy change on the marketing site's banner must be
 * mirrored here so the two stay in sync.
 *
 * Clarity and SalesIQ are gated on the `analytics` purpose, same as
 * clarity-loader and salesiq-loader in marketing-website-app: Clarity records
 * sessions, and SalesIQ tracks visitors (vts.zohopublic.com) and keeps a
 * per-visitor identity in local storage, so neither loads until the visitor has
 * actually said yes.
 *
 * Purpose IDs and widget IDs are hardcoded because Mintlify has no build step
 * and no env vars. They must stay in sync with marketing-website-app's
 * NEXT_PUBLIC_ZARAZ_PURPOSE_ANALYTICS, NEXT_PUBLIC_ZARAZ_PURPOSE_ADVERTISING,
 * NEXT_PUBLIC_CLARITY_ID, and NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_CODE.
 */
(function () {
  var ANALYTICS_PURPOSE_ID = "zQrb";
  var ADVERTISING_PURPOSE_ID = "KAqF";
  var CLARITY_ID = "vsl61vxskh";
  var SALESIQ_WIDGET_CODE =
    "siqbf2820ce0c5e80da008120c8e53c07f1a15c4160c69e7618704edfb1a9db38ca";

  var CONSENT_READY_EVENT = "zarazConsentAPIReady";
  var CONSENT_CHANGE_EVENT = "zarazConsentChoicesUpdated";
  var CONSENT_COOKIE = "zaraz-consent";

  var PRIVACY_HREF = "https://www.smartretry.com/privacy-policy";
  var COOKIE_POLICY_HREF = "https://www.smartretry.com/cookie-policy";

  var LABELS = {
    title: "We value your privacy",
    body:
      "SmartRetry uses cookies for core site functionality, analytics, and advertising. Manage your choices in Cookie Preferences. For details, see our",
    linkSeparator: " and ",
    linkSuffix: ".",
    privacyLinkLabel: "Privacy Policy",
    cookiePolicyLinkLabel: "Cookie Policy",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    customize: "Customize",
    modalTitle: "Cookie preferences",
    modalBody:
      "Choose which categories of cookies you allow. You can change your choice at any time from the footer.",
    policyLinkLabel: "Read our cookie policy",
    essentialTitle: "Strictly necessary",
    essentialBody: "Required for the site to function. Always on.",
    essentialAlwaysOn: "Always on",
    analyticsTitle: "Analytics",
    analyticsBody:
      "Help us understand how visitors use the site so we can improve it.",
    advertisingTitle: "Advertising",
    advertisingBody:
      "Allow us to measure campaign performance and personalize ads.",
    save: "Save preferences",
    cancel: "Cancel",
  };

  // ---------------------------------------------------------------------
  // Zaraz consent helpers (mirrors services/analytics/consent.ts)
  // ---------------------------------------------------------------------

  function getReadyConsent() {
    var consent = window.zaraz && window.zaraz.consent;
    return consent && consent.APIReady ? consent : undefined;
  }

  function getConsent(purposeId) {
    var consent = getReadyConsent();
    if (!consent) return "pending";
    try {
      return consent.get(purposeId);
    } catch (error) {
      return "pending";
    }
  }

  function hasAnalyticsConsent() {
    return getConsent(ANALYTICS_PURPOSE_ID) === true;
  }

  function hasUserChosen() {
    return new RegExp("(?:^|; )" + CONSENT_COOKIE + "=").test(document.cookie);
  }

  function acceptAll() {
    var consent = getReadyConsent();
    if (!consent) return;
    try {
      consent.setAll(true);
      consent.sendQueuedEvents();
    } catch (error) {
      /* Zaraz may reject unknown purpose IDs - never crash the UI for that. */
    }
  }

  function rejectAll() {
    var consent = getReadyConsent();
    if (!consent) return;
    try {
      consent.setAll(false);
    } catch (error) {
      /* see acceptAll */
    }
  }

  function setConsent(choices) {
    var consent = getReadyConsent();
    if (!consent) return;
    try {
      var update = {};
      update[ANALYTICS_PURPOSE_ID] = choices.analytics;
      update[ADVERTISING_PURPOSE_ID] = choices.advertising;
      consent.set(update);
      if (choices.analytics || choices.advertising) {
        consent.sendQueuedEvents();
      }
    } catch (error) {
      /* see acceptAll */
    }
  }

  function getCurrentChoices() {
    var consent = getReadyConsent();
    if (!consent) return { analytics: false, advertising: false };
    var all = (consent.getAll && consent.getAll()) || {};
    return {
      analytics: all[ANALYTICS_PURPOSE_ID] === true,
      advertising: all[ADVERTISING_PURPOSE_ID] === true,
    };
  }

  // ---------------------------------------------------------------------
  // Third-party script loaders
  // ---------------------------------------------------------------------

  function loadClarity() {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  function loadSalesIq() {
    if (document.getElementById("zsiqscript")) return;

    window.$zoho = window.$zoho || {};
    window.$zoho.salesiq = window.$zoho.salesiq || { ready: function () {} };

    var script = document.createElement("script");
    script.id = "zsiqscript";
    script.src =
      "https://salesiq.zohopublic.com/widget?wc=" + SALESIQ_WIDGET_CODE;
    script.defer = true;
    document.body.appendChild(script);
  }

  function checkThirdPartyScripts() {
    if (!hasAnalyticsConsent()) return;
    loadClarity();
    loadSalesIq();
    // Once loaded the scripts cannot be unloaded, so stop listening. Withdrawn
    // consent takes effect on the next page load, same as on the marketing site.
    document.removeEventListener(CONSENT_CHANGE_EVENT, checkThirdPartyScripts);
  }

  // ---------------------------------------------------------------------
  // Banner + customize dialog UI
  // ---------------------------------------------------------------------

  var STYLE_ID = "sr-consent-style";
  var STYLE = [
    "#sr-consent-banner,#sr-consent-modal-overlay{font-family:inherit;box-sizing:border-box}",
    "#sr-consent-banner *,#sr-consent-modal-overlay *{box-sizing:border-box}",
    "#sr-consent-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:16px}",
    "@media(min-width:640px){#sr-consent-banner{padding:24px}}",
    "#sr-consent-banner-inner{margin:0 auto;max-width:64rem;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(31,31,31,0.95);padding:20px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,0.5);backdrop-filter:blur(8px)}",
    "@media(min-width:640px){#sr-consent-banner-inner{padding:24px}}",
    "#sr-consent-banner-row{display:flex;flex-direction:column;gap:16px}",
    "@media(min-width:768px){#sr-consent-banner-row{flex-direction:row;align-items:center;justify-content:space-between;gap:24px}}",
    "#sr-consent-text{flex:1}",
    "#sr-consent-title{margin:0 0 8px;font-size:16px;font-weight:600}",
    "#sr-consent-body{margin:0;font-size:14px;font-weight:400;line-height:1.6;color:rgba(255,255,255,0.8)}",
    ".sr-consent-link{color:inherit;text-decoration:underline;text-underline-offset:2px}",
    ".sr-consent-link:hover{color:#FE37A2}",
    "#sr-consent-actions{display:flex;flex-direction:column;gap:8px}",
    "@media(min-width:640px){#sr-consent-actions{flex-direction:row;flex-wrap:wrap}}",
    "@media(min-width:768px){#sr-consent-actions{flex-wrap:nowrap}}",
    ".sr-consent-btn{border-radius:9999px;padding:8px 20px;font-size:14px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.3);background:transparent;color:#fff;transition:background-color .15s}",
    ".sr-consent-btn:hover{background:rgba(255,255,255,0.1)}",
    ".sr-consent-btn-primary{border:none;font-weight:600;background:#D01A87;color:#fff}",
    ".sr-consent-btn-primary:hover{background:#FE37A2}",
    "#sr-consent-modal-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px}",
    "#sr-consent-modal{width:100%;max-width:32rem;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:#1F1F1F;padding:20px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;display:flex;flex-direction:column;gap:16px}",
    "@media(min-width:640px){#sr-consent-modal{padding:24px}}",
    "#sr-consent-modal-head{padding-right:32px}",
    "#sr-consent-modal-title{margin:0 0 6px;font-size:16px;font-weight:600}",
    "@media(min-width:640px){#sr-consent-modal-title{font-size:18px}}",
    "#sr-consent-modal-body{margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7)}",
    "#sr-consent-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;padding:4px;line-height:0;opacity:.7}",
    "#sr-consent-modal-close:hover{opacity:1}",
    ".sr-consent-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);padding:16px}",
    ".sr-consent-row-title{margin:0;font-size:14px;font-weight:600}",
    "@media(min-width:640px){.sr-consent-row-title{font-size:16px}}",
    ".sr-consent-row-body{margin:4px 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.7)}",
    "@media(min-width:640px){.sr-consent-row-body{font-size:14px}}",
    ".sr-consent-row-control{flex-shrink:0;padding-top:2px}",
    ".sr-consent-pill{border-radius:9999px;background:rgba(255,255,255,0.1);padding:4px 10px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.02em;color:rgba(255,255,255,0.7)}",
    ".sr-consent-switch{position:relative;display:inline-flex;align-items:center;width:36px;height:20px;border-radius:9999px;border:none;background:rgba(255,255,255,0.2);cursor:pointer;padding:0;transition:background-color .15s}",
    ".sr-consent-switch[data-checked=\"true\"]{background:#D01A87}",
    ".sr-consent-switch-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:9999px;background:#fff;transition:transform .15s}",
    ".sr-consent-switch[data-checked=\"true\"] .sr-consent-switch-thumb{transform:translateX(16px)}",
    "#sr-consent-modal-actions{display:flex;flex-direction:column-reverse;gap:8px}",
    "@media(min-width:640px){#sr-consent-modal-actions{flex-direction:row;justify-content:flex-end}}",
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

  function buildBodyWithLinks() {
    var p = el("p", { id: "sr-consent-body" });
    p.appendChild(document.createTextNode(LABELS.body + " "));
    p.appendChild(
      el("a", {
        class: "sr-consent-link",
        href: PRIVACY_HREF,
        text: LABELS.privacyLinkLabel,
      })
    );
    p.appendChild(document.createTextNode(LABELS.linkSeparator));
    p.appendChild(
      el("a", {
        class: "sr-consent-link",
        href: COOKIE_POLICY_HREF,
        text: LABELS.cookiePolicyLinkLabel,
      })
    );
    p.appendChild(document.createTextNode(LABELS.linkSuffix));
    return p;
  }

  function renderBanner() {
    if (document.getElementById("sr-consent-banner")) return;

    var acceptBtn = el("button", {
      type: "button",
      class: "sr-consent-btn sr-consent-btn-primary",
      text: LABELS.acceptAll,
    });
    var rejectBtn = el("button", {
      type: "button",
      class: "sr-consent-btn",
      text: LABELS.rejectAll,
    });
    var customizeBtn = el("button", {
      type: "button",
      class: "sr-consent-btn",
      text: LABELS.customize,
    });

    acceptBtn.addEventListener("click", function () {
      acceptAll();
      hideBanner();
    });
    rejectBtn.addEventListener("click", function () {
      rejectAll();
      hideBanner();
    });
    customizeBtn.addEventListener("click", function () {
      openModal();
    });

    var banner = el(
      "div",
      { id: "sr-consent-banner", role: "dialog", "aria-modal": "false", "aria-label": LABELS.title },
      [
        el("div", { id: "sr-consent-banner-inner" }, [
          el("div", { id: "sr-consent-banner-row" }, [
            el("div", { id: "sr-consent-text" }, [
              el("p", { id: "sr-consent-title", text: LABELS.title }),
              buildBodyWithLinks(),
            ]),
            el(
              "div",
              { id: "sr-consent-actions", role: "group", "aria-label": "Cookie consent options" },
              [rejectBtn, customizeBtn, acceptBtn]
            ),
          ]),
        ]),
      ]
    );

    document.body.appendChild(banner);
  }

  function hideBanner() {
    var banner = document.getElementById("sr-consent-banner");
    if (banner) banner.remove();
  }

  function makeSwitch(labelText, checked) {
    var thumb = el("span", { class: "sr-consent-switch-thumb" });
    var button = el("button", {
      type: "button",
      class: "sr-consent-switch",
      "data-checked": checked ? "true" : "false",
      "aria-pressed": checked ? "true" : "false",
      "aria-label": labelText,
    });
    button.appendChild(thumb);
    button.addEventListener("click", function () {
      var next = button.getAttribute("data-checked") !== "true";
      button.setAttribute("data-checked", next ? "true" : "false");
      button.setAttribute("aria-pressed", next ? "true" : "false");
    });
    return button;
  }

  function openModal() {
    closeModal();

    var current = hasUserChosen()
      ? getCurrentChoices()
      : { analytics: true, advertising: true };

    var analyticsSwitch = makeSwitch(LABELS.analyticsTitle, current.analytics);
    var advertisingSwitch = makeSwitch(LABELS.advertisingTitle, current.advertising);

    var saveBtn = el("button", {
      type: "button",
      class: "sr-consent-btn sr-consent-btn-primary",
      text: LABELS.save,
    });
    var cancelBtn = el("button", {
      type: "button",
      class: "sr-consent-btn",
      text: LABELS.cancel,
    });
    var closeBtn = el("button", {
      type: "button",
      id: "sr-consent-modal-close",
      "aria-label": LABELS.cancel,
      text: "×",
    });

    saveBtn.addEventListener("click", function () {
      setConsent({
        analytics: analyticsSwitch.getAttribute("data-checked") === "true",
        advertising: advertisingSwitch.getAttribute("data-checked") === "true",
      });
      closeModal();
      hideBanner();
    });
    cancelBtn.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);

    var modalBody = el("p", { id: "sr-consent-modal-body" });
    modalBody.appendChild(document.createTextNode(LABELS.modalBody + " "));
    modalBody.appendChild(
      el("a", {
        class: "sr-consent-link",
        href: COOKIE_POLICY_HREF,
        text: LABELS.policyLinkLabel,
      })
    );

    var overlay = el(
      "div",
      { id: "sr-consent-modal-overlay" },
      [
        el("div", { id: "sr-consent-modal", role: "dialog", "aria-modal": "true", "aria-label": LABELS.modalTitle }, [
          closeBtn,
          el("div", { id: "sr-consent-modal-head" }, [
            el("p", { id: "sr-consent-modal-title", text: LABELS.modalTitle }),
            modalBody,
          ]),
          el("div", { class: "sr-consent-rows" }, [
            el("div", { class: "sr-consent-row" }, [
              el("div", {}, [
                el("p", { class: "sr-consent-row-title", text: LABELS.essentialTitle }),
                el("p", { class: "sr-consent-row-body", text: LABELS.essentialBody }),
              ]),
              el("div", { class: "sr-consent-row-control" }, [
                el("span", { class: "sr-consent-pill", text: LABELS.essentialAlwaysOn }),
              ]),
            ]),
            el("div", { class: "sr-consent-row" }, [
              el("div", {}, [
                el("p", { class: "sr-consent-row-title", text: LABELS.analyticsTitle }),
                el("p", { class: "sr-consent-row-body", text: LABELS.analyticsBody }),
              ]),
              el("div", { class: "sr-consent-row-control" }, [analyticsSwitch]),
            ]),
            el("div", { class: "sr-consent-row" }, [
              el("div", {}, [
                el("p", { class: "sr-consent-row-title", text: LABELS.advertisingTitle }),
                el("p", { class: "sr-consent-row-body", text: LABELS.advertisingBody }),
              ]),
              el("div", { class: "sr-consent-row-control" }, [advertisingSwitch]),
            ]),
          ]),
          el("div", { id: "sr-consent-modal-actions" }, [cancelBtn, saveBtn]),
        ]),
      ]
    );

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
  }

  function closeModal() {
    var overlay = document.getElementById("sr-consent-modal-overlay");
    if (overlay) overlay.remove();
  }

  function checkBanner() {
    if (!getReadyConsent()) return;
    if (hasUserChosen()) {
      hideBanner();
      return;
    }
    renderBanner();
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------

  injectStyle();

  function onReadyOrChange() {
    checkBanner();
    checkThirdPartyScripts();
  }

  // The consent API may already be ready by the time Mintlify runs this file.
  onReadyOrChange();
  document.addEventListener(CONSENT_READY_EVENT, onReadyOrChange, { once: true });
  document.addEventListener(CONSENT_CHANGE_EVENT, onReadyOrChange);
})();
