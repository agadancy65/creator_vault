(function () {
  var API = "/api/admin/reports";
  var list = document.getElementById("report-queue");
  if (!list) return;
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".rtab"));
  var current = "OPEN";

  var PLATFORM = { INSTAGRAM: "Instagram", TIKTOK: "TikTok", X: "X (Twitter)", YOUTUBE: "YouTube", FACEBOOK: "Facebook" };
  var STATUS = {
    OPEN: ["Open", "badge-amber"],
    CONFIRMED: ["Confirmed", "badge-green"],
    DISMISSED: ["Dismissed", "badge-muted"],
  };
  var HANDLE_STATUS = {
    VERIFIED: "verified",
    PENDING_REVIEW: "in review",
    PENDING_PROOF: "awaiting proof",
    REJECTED: "rejected",
    REVOKED: "revoked",
  };

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function link(url, text) {
    var a = el("a", "text-link", text);
    if (/^https:\/\//i.test(url)) {
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    return a;
  }
  function row(label, node) {
    var d = el("div");
    d.appendChild(el("span", "", label));
    d.appendChild(node);
    return d;
  }
  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.className = "handle-msg" + (kind ? " is-" + kind : "");
  }
  function button(label, className, handler) {
    var b = el("button", "button button-small " + className, label);
    b.type = "button";
    b.addEventListener("click", handler);
    return b;
  }

  async function api(path, options) {
    var opts = Object.assign(
      { credentials: "same-origin", headers: { "Content-Type": "application/json" } },
      options || {}
    );
    var res = await fetch(API + path, opts);
    var data = {};
    try {
      data = await res.json();
    } catch (e) {}
    if (res.status === 401) {
      window.location.href = "login.html";
      throw new Error("Please log in.");
    }
    if (res.status === 403) throw new Error("This page is for admins only.");
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function act(btn, msg, workingLabel, fn) {
    var original = btn.textContent;
    var all = btn.closest(".handle-card").querySelectorAll("button, input");
    all.forEach(function (b) {
      b.disabled = true;
    });
    btn.textContent = workingLabel;
    btn.classList.add("is-loading");
    setMsg(msg, "");
    try {
      await fn();
    } catch (e) {
      setMsg(msg, e.message, "error");
    } finally {
      if (btn.isConnected) {
        btn.classList.remove("is-loading");
        btn.textContent = original;
        all.forEach(function (b) {
          b.disabled = false;
        });
      }
    }
  }

  function renderCard(r) {
    var card = el("article", "card handle-card");

    var head = el("div", "handle-card-head");
    var title = el("div", "handle-title");
    title.appendChild(el("strong", "", "@" + r.handle));
    title.appendChild(el("span", "handle-platform", PLATFORM[r.platform] || r.platform));
    var st = STATUS[r.status] || [r.status, "badge-muted"];
    head.appendChild(title);
    head.appendChild(el("span", "badge " + st[1], st[0]));
    card.appendChild(head);

    var d = el("div", "detail-list");
    d.appendChild(row("Reported by", el("strong", "", r.reporter.name + " (" + r.reporter.email + ")")));
    d.appendChild(
      row(
        "Real handle",
        link(r.realHandle.profileUrl, "@" + r.realHandle.handle + " (" + r.realHandle.user.name + ")")
      )
    );
    d.appendChild(row("Fake profile", link(r.profileUrl, r.profileUrl)));
    d.appendChild(row("Details", el("strong", "", r.details)));
    d.appendChild(row("Submitted", el("strong", "", new Date(r.createdAt).toLocaleString())));
    if (r.resolution) d.appendChild(row("Decision note", el("strong", "", r.resolution)));
    card.appendChild(d);

    var rh = r.reportedHandle;
    var warning = "";
    if (rh) {
      var box = el("div", "warning-box");
      box.appendChild(el("h2", "", "This profile is registered in CreatorVault"));
      var ul = el("ul");
      ul.appendChild(
        el(
          "li",
          "",
          "Owner: " + rh.user.name + " (" + rh.user.email + "), handle status: " + (HANDLE_STATUS[rh.status] || rh.status)
        )
      );
      box.appendChild(ul);
      card.appendChild(box);
      if (rh.status === "VERIFIED") warning = "This will REVOKE the verification of @" + rh.handle + ". Continue?";
      else if (rh.status === "PENDING_REVIEW" || rh.status === "PENDING_PROOF") warning = "This will REJECT the claim for @" + rh.handle + ". Continue?";
    } else {
      card.appendChild(el("p", "handle-note", "Not registered in CreatorVault. Confirming will record it as a known impersonator."));
    }

    var msg = el("p", "handle-msg");

    if (r.status === "OPEN") {
      var controls = el("div", "review-controls");
      var note = el("input");
      note.type = "text";
      note.maxLength = 500;
      note.placeholder = "Note (required to dismiss)";
      note.setAttribute("aria-label", "Note");
      controls.appendChild(note);

      var actions = el("div", "handle-actions");
      var confirm = button("Confirm impersonation", "button-danger", function () {
        if (!window.confirm(warning || "Record @" + r.handle + " as a confirmed impersonator?")) return;
        act(confirm, msg, "Confirming…", async function () {
          await api("/" + r.id + "/confirm", { method: "POST", body: JSON.stringify({ note: note.value.trim() }) });
          await load();
        });
      });
      var dismiss = button("Dismiss", "button-secondary", function () {
        if (note.value.trim().length < 3) {
          setMsg(msg, "Add a short reason before dismissing.", "error");
          note.focus();
          return;
        }
        act(dismiss, msg, "Dismissing…", async function () {
          await api("/" + r.id + "/dismiss", { method: "POST", body: JSON.stringify({ note: note.value.trim() }) });
          await load();
        });
      });
      actions.appendChild(confirm);
      actions.appendChild(dismiss);
      controls.appendChild(actions);
      card.appendChild(controls);
    }

    card.appendChild(msg);
    return card;
  }

  async function load() {
    list.replaceChildren(el("p", "handle-note", "Loading…"));
    try {
      var data = await api("?status=" + encodeURIComponent(current));
      if (!data.reports.length) {
        list.replaceChildren(el("p", "handle-note", "Nothing here."));
        return;
      }
      list.replaceChildren.apply(list, data.reports.map(renderCard));
    } catch (e) {
      list.replaceChildren(el("p", "field-error", e.message));
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      current = tab.getAttribute("data-status");
      tabs.forEach(function (t) {
        t.setAttribute("aria-pressed", t === tab ? "true" : "false");
      });
      load();
    });
  });

  load();
})();