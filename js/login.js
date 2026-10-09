(function () {
  // Part 1: "password was reset"
  var KEY = "cv_reset_done";
  var banner = document.getElementById("reset-success");
  if (banner) {
    var resetEmail = sessionStorage.getItem(KEY);
    if (resetEmail) {
      var text = banner.querySelector("strong");
      if (text) {
        // Echo user input with textContent, never innerHTML.
        text.textContent = "Password updated for " + resetEmail + ".";
      }
      banner.hidden = false;
      sessionStorage.removeItem(KEY);
    }
  }

  // Part 2: real login
  var form = document.querySelector("form.stack-form");
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    cvShowError(form, "");
    btn.disabled = true;
    try {
      var data = await cvApi("login", {
        email: form.elements["email"].value.trim(),
        password: form.elements["password"].value,
      });
      sessionStorage.setItem(
        "cv_account_type",
        data.user.role === "organization" ? "org" : "creator"
      );
      window.location.href = "dashboard.html";
    } catch (err) {
      if (err.data && err.data.code === "EMAIL_NOT_VERIFIED") {
        sessionStorage.setItem("cv_verify_email", err.data.email);
        window.location.href = "verify-email.html";
        return;
      }
      cvShowError(form, err.message);
    } finally {
      btn.disabled = false;
    }
  });
})();