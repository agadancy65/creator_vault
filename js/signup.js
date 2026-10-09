(function () {
  var form = document.querySelector("form[data-set-account-type]");
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    cvShowError(form, "");
    btn.disabled = true;

    var type = form.getAttribute("data-set-account-type");
    var role = type === "org" ? "organization" : "creator";

    try {
      var data = await cvApi("signup", {
        name: form.elements["name"].value.trim(),
        email: form.elements["email"].value.trim(),
        password: form.elements["password"].value,
        role: role,
      });
      sessionStorage.setItem("cv_verify_email", data.email);
      window.location.href = "verify-email.html";
    } catch (err) {
      cvShowError(form, err.message);
    } finally {
      btn.disabled = false;
    }
  });
})();