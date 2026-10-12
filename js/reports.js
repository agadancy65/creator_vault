(function () {
  var section = document.getElementById("report-section");
  if (!section) return;
  if (sessionStorage.getItem("cv_account_type") === "org") return;

  var form = document.getElementById("report-form");
  var select = document.getElementById("report-real");
  var urlInput = document.getElementById("report-url");
  var details = document.getElementById("report-details");
  var errorEl = document.getElementById("report-error");
  var btn = document.getElementById("report-btn");
  var list = document.getElementById("reports-list");
  var intro = document.getElementById("report-intro");

  var PLATFORM = { INSTAGRAM: "Instagram", TIKTOK: "TikTok", X: "X (Twitter)", YOUTUBE: "YouTube", FACEBOOK: "Facebook" };
  var STATUS = {
    OPEN: ["Under review", "badge-amber"],
    CONFIRMED: ["Confirmed fake", "badge-green"],
    DISMISSED: ["Dismissed", "badge-muted"],
  };

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  async function call(url, options) {
    var opts = Object.assign(
      { credentials: "same-origin", headers: { "Content-Type": "application/json" } },
      options || {}
    );
    var res = await fetch(url, opts);
    var data = {};
    try {
      data = await res.json();
    } catch (e) {}
    if (res.status === 401) {
      window.location.href = "login.html";
      throw new Error("Please log in.");
    }
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  function renderReports(reports) {
    list.replaceChildren.apply(
      list,
      reports.map(function (r) {
        var card = el("article", "card handle-card");
        var head = el("div", "handle-card-head");
        var title = el("div", "handle-title");
        title.appendChild(el("strong", "", "@" + r.handle));
        title.appendChild(el("span", "handle-platform", (PLATFORM[r.platform] || r.platform) + " · copying @" + r.realHandle.handle));
        var st = STATUS[r.status] || [r.status, "badge-muted"];
        head.appendChild(title);
        head.appendChild(el("span", "badge " + st[1], st[0]));
        card.appendChild(head);
        card.appendChild(el("p", "handle-note", r.details));
        if (r.resolution) card.appendChild(el("p", "handle-note", "Admin note: " + r.resolution));
        return card;
      })
    );
  }

  async function loadReports() {
    try {
      var data = await call("/api/reports");
      renderReports(data.reports);
    } catch (e) {}
  }

  async function init() {
    var verified = [];
    try {
      var data = await call("/api/creator/handles");
      verified = data.handles.filter(function (h) {
        return h.status === "VERIFIED";
      });
    } catch (e) {
      return;
    }

    section.hidden = false;
    if (window.location.hash === "#report-section") {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!verified.length) {
      form.hidden = true;
      intro.textContent = "Reporting impersonators unlocks once one of your handles is verified.";
      return;
    }

    select.replaceChildren.apply(
      select,
      verified.map(function (h) {
        var o = el("option", "", (PLATFORM[h.platform] || h.platform) + " @" + h.handle);
        o.value = h.id;
        return o;
      })
    );
    loadReports();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorEl.textContent = "";
    if (!urlInput.value.trim() || details.value.trim().length < 10) {
      errorEl.textContent = "Paste the fake profile link and describe what makes it fake.";
      return;
    }
    btn.disabled = true;
    btn.classList.add("is-loading");
    try {
      await call("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          realHandleId: select.value,
          profileUrl: urlInput.value.trim(),
          details: details.value.trim(),
        }),
      });
      urlInput.value = "";
      details.value = "";
      await loadReports();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  });

  init();
})();