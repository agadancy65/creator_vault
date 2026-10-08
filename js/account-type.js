// Account types: "user" (a visitor who is just searching),
// "creator" and "org".
//
// The type is chosen at signup and remembered for the rest of
// onboarding, so the shared handles/payout/dashboard pages can
// use the right wording without being duplicated per type.
//
// Elements that differ between types carry both wordings and are
// rewritten on load:
//   <h1 data-creator-text="Link your handles"
//       data-org-text="Link brand handles">Link your handles</h1>
//
// Marked elements must be text-only leaves, since the whole text
// content is replaced.
(function () {
  var KEY = "cv_account_type";

  function getType() {
    var type;
    try {
      type = sessionStorage.getItem(KEY);
    } catch (error) {
      return "creator";
    }
    // Default to creator so the existing screens keep their
    // current wording for anyone who did not pick a path.
    return type === "org" ? "org" : "creator";
  }

  function setType(type) {
    try {
      sessionStorage.setItem(KEY, type === "org" ? "org" : "creator");
    } catch (error) {
      /* storage unavailable; the type just won't persist */
    }
  }

  function apply() {
    var type = getType();

    document.querySelectorAll("[data-creator-text]").forEach(function (el) {
      var value =
        type === "org"
          ? el.getAttribute("data-org-text")
          : el.getAttribute("data-creator-text");
      // A null value means this element has no wording for the
      // other type, so it is left exactly as it is.
      if (value !== null) el.textContent = value;
    });

    document.querySelectorAll("[data-creator-href]").forEach(function (el) {
      var value =
        type === "org"
          ? el.getAttribute("data-org-href")
          : el.getAttribute("data-creator-href");
      if (value) el.setAttribute("href", value);
    });

    document.documentElement.setAttribute("data-account-type", type);
  }

  // Signup forms record the type they belong to. Registered in
  // the capture phase so it runs after form-validation.js has
  // rejected an invalid submit, and before navigation.js moves
  // to the next step.
  document
    .querySelectorAll("form[data-set-account-type]")
    .forEach(function (form) {
      var type = form.getAttribute("data-set-account-type");
      form.addEventListener(
        "submit",
        function () {
          setType(type);
        },
        true,
      );
    });

  window.CreatorVault = window.CreatorVault || {};
  window.CreatorVault.getAccountType = getType;
  window.CreatorVault.setAccountType = setType;

  apply();
})();
