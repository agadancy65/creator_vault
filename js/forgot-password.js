(function () {
  var form = document.getElementById("forgot-form");
  var confirmPanel = document.getElementById("reset-confirm");
  if (!form || !confirmPanel) return;

  var emailEl = document.getElementById("confirm-email");
  var timeEl = document.getElementById("confirm-time");
  var resendBtn = document.getElementById("resend-link");
  var openBtn = document.getElementById("open-reset");
  var btn = form.querySelector('button[type="submit"]');

  function stamp() {
    if (!timeEl) return;
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
    if (emailEl) emailEl.textContent = email;
    form.hidden = true;
    confirmPanel.hidden = false;
    stamp();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    cvShowError(form, "");
    btn.disabled = true;
    var email = form.elements.email.value.trim();
    try {
      await cvApi("forgot-password", { email: email });
      sessionStorage.setItem("cv_reset_email", email);
      showConfirmation(email);
    } catch (err) {
      cvShowError(form, err.message);
    } finally {
      btn.disabled = false;
    }
  });

  if (resendBtn) {
    resendBtn.addEventListener("click", async function () {
      try {
        await cvApi("forgot-password", {
          email: sessionStorage.getItem("cv_reset_email"),
        });
        stamp();
      } catch (err) {}
    });
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      window.location.href = "reset-password.html";
    });
  }
})();