(function () {
  var heading = document.getElementById("welcome-heading");
  var avatar = document.getElementById("user-avatar");
  var authLink = document.getElementById("auth-link");

  function show() {
    document.body.classList.remove("auth-pending");
  }

  function load(attempt) {
    cvGet("me")
      .then(function (data) {
        var user = data.user;
        var type = user.role === "organization" ? "org" : "creator";
        sessionStorage.setItem("cv_account_type", type);
        document.documentElement.setAttribute("data-account-type", type);

        if (heading) heading.textContent = "Welcome back, " + user.name.split(" ")[0] + ".";
        if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

        if (authLink) {
          authLink.textContent = "Log out";
          authLink.setAttribute("href", "#");
          authLink.addEventListener("click", async function (event) {
            event.preventDefault();
            try { await cvApi("logout", {}); } catch (e) {}
            window.location.href = "login.html";
          });
        }
        show();
      })
      .catch(function (err) {
        if (err && err.status === 401) {
          window.location.href = "login.html";
          return;
        }
        if (attempt < 3) {
          setTimeout(function () { load(attempt + 1); }, 1500);
          return;
        }
        console.error("Dashboard error:", err);
        show();
      });
  }

  load(1);
})();