(function () {
  var API = "/api/creator";
  var form = document.getElementById("add-handle-form");
  if (!form) return;

  var area = document.getElementById("creator-area");
  var orgNote = document.getElementById("org-note");
  if (sessionStorage.getItem("cv_account_type") === "org") {
    area.hidden = true;
    orgNote.hidden = false;
    return;
  }

  var input = document.getElementById("profile-url");
  var addBtn = document.getElementById("add-btn");
  var addError = document.getElementById("add-error");
  var list = document.getElementById("handles-list");
  var empty = document.getElementById("handles-empty");

  var PLATFORM = {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    X: "X (Twitter)",
    YOUTUBE: "YouTube",
    FACEBOOK: "Facebook",
  };
  var STATUS = {
    PENDING_PROOF: ["Needs proof", "badge-amber"],
    PENDING_REVIEW: ["In review", "badge-amber"],
    VERIFIED: ["Verified", "badge-green"],
    REJECTED: ["Rejected", "badge-red"],
    REVOKED: ["Revoked", "badge-red"],
  };

  // ---------- helpers ----------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // textContent only, never innerHTML
    return node;
  }

  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.className = "handle-msg" + (kind ? " is-" + kind : "");
  }

  async function call(path, options) {
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
    if (res.status === 403) throw new Error("Only creator accounts can link handles.");
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  function copyText(text, btn) {
    function done() {
      btn.textContent = "Copied";
      setTimeout(function () {
        btn.textContent = "Copy";
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  // Disables the card's buttons and spins the clicked one while an action runs.
  async function act(btn, msg, workingLabel, fn) {
    var original = btn.textContent;
    var all = btn.closest(".handle-card").querySelectorAll("button");
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

  function button(label, className, handler) {
    var b = el("button", "button button-small " + className, label);
    b.type = "button";
    b.addEventListener("click", handler);
    return b;
  }

  // ---------- rendering ----------
  function proofBox(h) {
    var platform = PLATFORM[h.platform] || h.platform;
    var box = el("div", "proof-box");
    box.appendChild(el("p", "", "Step 1: add this code to your " + platform + " bio and save it."));
    var row = el("div", "proof-row");
    row.appendChild(el("code", "proof-code", h.proofCode));
    var copy = button("Copy", "button-secondary", function () {
      copyText(h.proofCode, copy);
    });
    row.appendChild(copy);
    box.appendChild(row);
    return box;
  }

  function renderHandle(h) {
    var card = el("article", "card handle-card");

    var head = el("div", "handle-card-head");
    var title = el("div", "handle-title");
    title.appendChild(el("strong", "", "@" + h.handle));
    title.appendChild(el("span", "handle-platform", PLATFORM[h.platform] || h.platform));
    var st = STATUS[h.status] || [h.status, "badge-muted"];
    head.appendChild(title);
    head.appendChild(el("span", "badge " + st[1], st[0]));
    card.appendChild(head);

    var msg = el("p", "handle-msg");
    var actions = el("div", "handle-actions");

    function removeButton() {
      var btn = button("Remove", "button-secondary", function () {
        if (!window.confirm("Remove @" + h.handle + "?")) return;
        act(btn, msg, "Removing…", async function () {
          await call("/handles/" + h.id, { method: "DELETE" });
          await load();
        });
      });
      return btn;
    }

    if (h.status === "PENDING_PROOF") {
      card.appendChild(proofBox(h));
      card.appendChild(
        el(
          "p",
          "handle-note",
          "Step 2: press Check. If we can't read your profile automatically, request a review and an admin will confirm the code on your live profile."
        )
      );

      var check = button("Check", "button-primary", function () {
        act(check, msg, "Checking…", async function () {
          var data = await call("/handles/" + h.id + "/check", { method: "POST" });
          if (data.confirmed) await load();
          else setMsg(msg, data.message, "error");
        });
      });
      var review = button("Request review", "button-secondary", function () {
        act(review, msg, "Sending…", async function () {
          await call("/handles/" + h.id + "/request-review", { method: "POST" });
          await load();
        });
      });
      actions.appendChild(check);
      actions.appendChild(review);
      actions.appendChild(removeButton());
    } else if (h.status === "PENDING_REVIEW") {
      card.appendChild(
        el(
          "p",
          "handle-note",
          "An admin is reviewing this handle. Keep this code in your bio until you are verified."
        )
      );
      card.appendChild(proofBox(h));
      actions.appendChild(removeButton());
    } else if (h.status === "VERIFIED") {
      var levelText =
        h.level === 2
          ? " Level 2: identity confirmed through your bank account."
          : " Level 1: handle confirmed. Add a payout account to reach Level 2.";
      card.appendChild(
        el(
          "p",
          "handle-note",
          "Verified" +
            (h.verifiedAt ? " on " + new Date(h.verifiedAt).toLocaleDateString() : "") +
            "." +
            levelText
        )
      );
      actions.appendChild(removeButton());
    } else {
      // REJECTED or REVOKED
      card.appendChild(
        el("p", "handle-note", h.reviewNote ? "Reason: " + h.reviewNote : "This handle was not approved.")
      );
      actions.appendChild(removeButton());
    }

    if (actions.childNodes.length) card.appendChild(actions);
    card.appendChild(msg);
    return card;
  }

  function render(handles) {
    list.replaceChildren.apply(list, handles.map(renderHandle));
    empty.hidden = handles.length > 0;
  }

  async function load() {
    try {
      var data = await call("/handles");
      render(data.handles);
    } catch (e) {
      list.replaceChildren(el("p", "field-error", e.message));
    }
  }

  // ---------- add a handle ----------
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    addError.textContent = "";
    var value = input.value.trim();
    if (!value) {
      addError.textContent = "Paste your profile link.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    addBtn.disabled = true;
    addBtn.classList.add("is-loading");
    try {
      await call("/handles", { method: "POST", body: JSON.stringify({ profileUrl: value }) });
      input.value = "";
      await load();
    } catch (err) {
      addError.textContent = err.message;
      input.setAttribute("aria-invalid", "true");
    } finally {
      addBtn.classList.remove("is-loading");
      addBtn.disabled = false;
    }
  });

  load();
})();