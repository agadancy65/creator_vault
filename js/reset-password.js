(function () {
  var email = sessionStorage.getItem("cv_reset_email");
  if (!email) {
    window.location.href = "forgot-password.html";
    return;
  }

  var target = document.getElementById("reset-email");
  if (target) target.textContent = email;

  var form = document.getElementById("reset-form");
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async function (event) {
    // form-validation.js already blocked invalid submits
    event.preventDefault();
    cvShowError(form, "");
    btn.disabled = true;
    try {
      await cvApi("reset-password", {
        email: email,
        code: form.elements["code"].value.trim(),
        newPassword: form.elements["password"].value,
      });
      sessionStorage.setItem("cv_reset_done", email);
      sessionStorage.removeItem("cv_reset_email");
      window.location.href = "login.html";
    } catch (err) {
      cvShowError(form, err.message);
    } finally {
      btn.disabled = false;
    }
  });
})();