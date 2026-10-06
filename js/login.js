// Shows the "password was reset" notice when arriving from the
// reset flow. The flag is set by reset-password.html and is
// cleared here so it is only shown once.
(function () {
  var KEY = "cv_reset_done";
  var banner = document.getElementById("reset-success");
  if (!banner) return;

  var email = sessionStorage.getItem(KEY);
  if (!email) return;

  var text = banner.querySelector("strong");
  if (text) {
    // Echo user input with textContent, never innerHTML.
    text.textContent = "Password updated for " + email + ".";
  }
  banner.hidden = false;
  sessionStorage.removeItem(KEY);
})();
