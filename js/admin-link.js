(function () {
  fetch("/api/auth/me", { credentials: "same-origin" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || data.user.role !== "admin") return;
      var actions = document.querySelector(".topbar-actions");
      if (!actions) return;
      var a = document.createElement("a");
      a.className = "text-link";
      a.href = "admin.html";
      a.textContent = "Admin";
      actions.insertBefore(a, actions.firstChild);
    })
    .catch(function () {});
})();