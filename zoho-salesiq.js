/**
 * Zoho SalesIQ live chat widget.
 *
 * Mintlify loads every .js file in the content directory on all pages, after the
 * page becomes interactive. Raw <script> tags are not supported in MDX, so the
 * widget script is injected programmatically here.
 */
(function () {
  if (document.getElementById("zsiqscript")) return;

  window.$zoho = window.$zoho || {};
  window.$zoho.salesiq = window.$zoho.salesiq || { ready: function () {} };

  var script = document.createElement("script");
  script.id = "zsiqscript";
  script.src =
    "https://salesiq.zohopublic.com/widget?wc=siqbf2820ce0c5e80da008120c8e53c07f1a15c4160c69e7618704edfb1a9db38ca";
  script.defer = true;
  document.body.appendChild(script);
})();
