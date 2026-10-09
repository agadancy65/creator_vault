(function () {
  var form = document.getElementById("verify-form");
  if (!form) return;
  var email = sessionStorage.getItem("cv_verify_email");
  if (!email) { window.location.href = "signup.html"; return; }
  document.getElementById("verify-email").textContent = email;
  var btn = form.querySelector('button[type="submit"]');
  var note = document.getElementById("resend-note");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    cvShowError(form, "");
    btn.disabled = true;
    try {
      await cvApi("verify-email", {
        email: email,
        code: form.elements["code"].value.trim(),
      });
      sessionStorage.removeItem("cv_verify_email");
      window.location.href = "handles.html";
    } catch (err) {
      cvShowError(form, err.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("resend").addEventListener("click", async function () {
    try {
      await cvApi("resend-code", { email: email });
      note.textContent = " New code sent (if 60 seconds have passed).";
    } catch (err) {
      note.textContent = " " + err.message;
    }
  });
})();