// Completes the front-end password reset.
//
// The email was stashed by forgot-password.html. There is no
// backend, so this only simulates the reset: it records that a
// reset happened and returns to the log-in screen, which shows
// a confirmation.
(function () {
  var email = sessionStorage.getItem("cv_reset_email");

  var target = document.getElementById("reset-email");
  if (target) {
    // Echo user input with textContent, never innerHTML.
    target.textContent = email || "your account";
  }

  var form = document.getElementById("reset-form");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    // form-validation.js stops invalid submits in the capture
    // phase, so reaching here means both passwords are valid
    // and match.
    event.preventDefault();
    sessionStorage.setItem("cv_reset_done", email || "");
    sessionStorage.removeItem("cv_reset_email");
    window.location.href = "login.html";
  });
})();
