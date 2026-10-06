// Front-end-only "forgot password".
//
// Validates the email, then swaps the form for a confirmation
// that echoes the address back and stashes it in sessionStorage
// so reset-password.html can show it. There is no backend, so
// the reset link itself is simulated by a button.
(function () {
  var form = document.getElementById("forgot-form");
  var confirmPanel = document.getElementById("reset-confirm");
  if (!form || !confirmPanel) return;

  var emailEl = document.getElementById("confirm-email");
  var timeEl = document.getElementById("confirm-time");
  var resendBtn = document.getElementById("resend-link");
  var openBtn = document.getElementById("open-reset");

  function stamp() {
    if (!timeEl) return;
    // Seconds are included so a resend is visibly reflected
    // even within the same minute.
    timeEl.textContent =
      "Sent " +
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      ".";
  }

  function showConfirmation(email) {
    // Echo user input with textContent, never innerHTML.
    if (emailEl) emailEl.textContent = email;
    form.hidden = true;
    confirmPanel.hidden = false;
    stamp();
  }

  form.addEventListener("submit", function (event) {
    // form-validation.js stops invalid submits in the capture
    // phase, so reaching here means the email is valid.
    event.preventDefault();
    var email = form.elements.email.value.trim();
    sessionStorage.setItem("cv_reset_email", email);
    showConfirmation(email);
  });

  if (resendBtn) {
    resendBtn.addEventListener("click", stamp);
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      window.location.href = "reset-password.html";
    });
  }
})();
