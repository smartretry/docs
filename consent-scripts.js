/**
 * Consent-gated third-party scripts (Microsoft Clarity + Zoho SalesIQ).
 *
 * Mintlify loads every .js file in the content directory on all pages, after the
 * page becomes interactive. Raw <script> tags are not supported in MDX, so both
 * widgets are injected programmatically here.
 *
 * The docs are served from https://www.smartretry.com/docs, the same origin as
 * the marketing site, so Cloudflare Zaraz's consent state applies here too. Both
 * scripts are gated on the `analytics` purpose, mirroring clarity-loader and
 * salesiq-loader in marketing-website-app: Clarity records sessions, and SalesIQ
 * tracks visitors (vts.zohopublic.com) and keeps a per-visitor identity in local
 * storage, so neither loads until the visitor has actually said yes.
 *
 * The consent banner itself lives on the marketing site - there is no banner on
 * Mintlify pages, so a visitor who lands here first stays at "pending" (nothing
 * loads) until they make a choice on www.smartretry.com.
 *
 * Purpose ID and widget IDs are hardcoded because Mintlify has no build step and
 * no env vars. They must stay in sync with marketing-website-app's
 * NEXT_PUBLIC_ZARAZ_PURPOSE_ANALYTICS, NEXT_PUBLIC_CLARITY_ID, and
 * NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_CODE.
 */
(function () {
  var ANALYTICS_PURPOSE_ID = "zQrb";
  var CLARITY_ID = "vsl61vxskh";
  var SALESIQ_WIDGET_CODE =
    "siqbf2820ce0c5e80da008120c8e53c07f1a15c4160c69e7618704edfb1a9db38ca";

  var CONSENT_READY_EVENT = "zarazConsentAPIReady";
  var CONSENT_CHANGE_EVENT = "zarazConsentChoicesUpdated";

  function hasAnalyticsConsent() {
    var consent = window.zaraz && window.zaraz.consent;
    if (!consent || !consent.APIReady) return false;
    try {
      return consent.get(ANALYTICS_PURPOSE_ID) === true;
    } catch (error) {
      // Zaraz throws on unknown purpose IDs - treat that as "no consent".
      return false;
    }
  }

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

  function check() {
    if (!hasAnalyticsConsent()) return;
    loadClarity();
    loadSalesIq();
    // Once loaded the scripts cannot be unloaded, so stop listening. Withdrawn
    // consent takes effect on the next page load, same as on the marketing site.
    document.removeEventListener(CONSENT_CHANGE_EVENT, check);
  }

  // The consent API may already be ready by the time Mintlify runs this file.
  check();
  document.addEventListener(CONSENT_READY_EVENT, check, { once: true });
  document.addEventListener(CONSENT_CHANGE_EVENT, check);
})();
