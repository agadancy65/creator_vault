// Password visibility toggles.
//
// Each toggle is a button inside the field, pointing at the
// input it controls by id:
//   <span class="field field--toggle">
//     <input id="password" type="password" ...>
//     <button type="button" class="password-toggle" data-toggle="password">
//       Show
//     </button>
//   </span>
//
// The button is type="button" so it never submits the form, and
// lives inside the label, where interactive content is excluded
// from label activation, so clicking it does not re-focus the
// input on its own.
(function () {
  document.querySelectorAll(".password-toggle").forEach(function (button) {
    var input = document.getElementById(button.getAttribute("data-toggle"));
    if (!input) return;

    function render(showing) {
      // The visible label ("Show"/"Hide") is contained in the
      // accessible name, so it satisfies Label in Name.
      button.textContent = showing ? "Hide" : "Show";
      button.setAttribute(
        "aria-label",
        showing ? "Hide password" : "Show password",
      );
      button.setAttribute("aria-pressed", String(showing));
    }

    button.addEventListener("click", function () {
      var showing = input.type === "text";

      // Preserve the caret, which focus() can move to the end.
      var start = input.selectionStart;
      var end = input.selectionEnd;

      input.type = showing ? "password" : "text";
      render(!showing);

      // Keep the field as the focus target so keyboard users
      // stay in context rather than landing on the toggle.
      input.focus();
      if (typeof start === "number" && typeof end === "number") {
        try {
          input.setSelectionRange(start, end);
        } catch (error) {
          /* selection is read-only on some password fields */
        }
      }
    });
  });
})();
