(function () {
  var statusEl = document.getElementById("stat-status");
  var countEl = document.getElementById("stat-handles");
  var rows = document.getElementById("handle-rows");
  if (!rows) return;

  var PLATFORM = { INSTAGRAM: "Instagram", TIKTOK: "TikTok", X: "X", YOUTUBE: "YouTube", FACEBOOK: "Facebook" };
  var BADGE = {
    VERIFIED: ["Verified", "badge-green"],
    PENDING_REVIEW: ["In review", "badge-amber"],
    PENDING_PROOF: ["Needs proof", "badge-amber"],
    REJECTED: ["Rejected", "badge-red"],
    REVOKED: ["Revoked", "badge-red"],
  };

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function setRows(nodes) {
    rows.replaceChildren.apply(rows, nodes);
  }
  function messageRow(text) {
    var r = el("div", "handle-row");
    r.appendChild(el("span", "", text));
    return r;
  }
  function setStatus(text, good) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "metric-value" + (good ? " positive" : "");
  }

  fetch("/api/creator/handles", { credentials: "same-origin" })
    .then(function (res) {
      return res.json().then(
        function (data) { return { res: res, data: data }; },
        function () { return { res: res, data: {} }; }
      );
    })
    .then(function (out) {
      if (out.res.status === 401) return; // dashboard.js handles the redirect to login
      if (!out.res.ok) {
        setStatus("—", false);
        if (countEl) countEl.textContent = "—";
        setRows([messageRow("Handle verification is available for creator accounts.")]);
        return;
      }

      var handles = out.data.handles || [];
      var has = function (s) {
        return handles.some(function (h) { return h.status === s; });
      };
      
      var reportCard = document.getElementById("report-card");
      if (reportCard) reportCard.hidden = !has("VERIFIED");
      if (has("VERIFIED")) setStatus("Verified", true);
      else if (has("PENDING_REVIEW")) setStatus("In review", false);
      else if (handles.length) setStatus("Not verified", false);
      else setStatus("No handles", false);

      if (countEl) countEl.textContent = String(handles.length);

      if (!handles.length) {
        setRows([messageRow("No handles yet. Press Edit to add one.")]);
        return;
      }
      setRows(
        handles.map(function (h) {
          var r = el("div", "handle-row");
          r.appendChild(el("span", "", (PLATFORM[h.platform] || h.platform) + " @" + h.handle));
          var b = BADGE[h.status] || [h.status, "badge-muted"];
          r.appendChild(el("span", "badge " + b[1], b[0]));
          return r;
        })
      );
    })
    .catch(function () {
      setRows([messageRow("Could not load your handles.")]);
    });
})();