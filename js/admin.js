(function () {
  var API = "/api/admin";
  var queue = document.getElementById("queue");
  if (!queue) return;
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var current = "PENDING_REVIEW";

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
  var FLAGS = {
    MANUAL_PROOF: "Manual review: check the code in the live bio",
    SIMILAR_TO_VERIFIED: "Resembles a verified creator",
    RISKY_NAME: "Contains a risky word (official, team, mgmt...)",
  };
  var DISPUTE = {
    EXACT_SAME_HANDLE: "same handle",
    LOOKALIKE_CHARACTERS: "same name with look-alike characters",
    SAME_CORE_NAME: "same core name with extra words",
    VERY_SIMILAR: "very similar spelling",
    SIMILAR_CORE_NAME: "very similar core name",
  };

  // ---------- helpers ----------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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

  function row(label, valueNode) {
    var div = el("div");
    div.appendChild(el("span", "", label));
    div.appendChild(valueNode);
    return div;
  }

  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.className = "handle-msg" + (kind ? " is-" + kind : "");
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

  // Disables the card's controls and spins the clicked button while an action runs.
  async function act(btn, msg, workingLabel, fn) {
    var original = btn.textContent;
    var all = btn.closest(".handle-card").querySelectorAll("button, input, select");
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
  function renderCard(h) {
    var card = el("article", "card handle-card");

    var head = el("div", "handle-card-head");
    var title = el("div", "handle-title");
    title.appendChild(el("strong", "", "@" + h.handle));
    title.appendChild(el("span", "handle-platform", PLATFORM[h.platform] || h.platform));
    var st = STATUS[h.status] || [h.status, "badge-muted"];
    head.appendChild(title);
    head.appendChild(el("span", "badge " + st[1], st[0]));
    card.appendChild(head);

    if (h.reviewReason) {
      var chips = el("div", "chip-row");
      h.reviewReason.split(",").forEach(function (code) {
        chips.appendChild(el("span", "chip", FLAGS[code] || code));
      });
      card.appendChild(chips);
    }

    var details = el("div", "detail-list");
    details.appendChild(row("Creator", el("strong", "", h.user.name + " (" + h.user.email + ")")));
    details.appendChild(row("Profile", link(h.profileUrl, h.profileUrl)));
    details.appendChild(row("Bio code", el("strong", "", h.proofCode)));
    details.appendChild(row("Submitted", el("strong", "", new Date(h.createdAt).toLocaleString())));
    if (h.reviewNote) details.appendChild(row("Note", el("strong", "", h.reviewNote)));
    card.appendChild(details);

    if (h.newDisputes && h.newDisputes.length) {
      var box = el("div", "warning-box");
      box.appendChild(el("h2", "", "Looks like a verified creator"));
      var ul = el("ul");
      h.newDisputes.forEach(function (d) {
        var e = d.existingHandle;
        var li = el("li");
        li.appendChild(
          document.createTextNode(
            "@" + e.handle + " (" + (PLATFORM[e.platform] || e.platform) + "), verified creator " +
              e.user.name + ": " + (DISPUTE[d.reason] || d.reason) + ", " +
              Math.round(d.similarity * 100) + "% similar. "
          )
        );
        li.appendChild(link(e.profileUrl, "Open real profile"));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      card.appendChild(box);
    }

    var msg = el("p", "handle-msg");

    if (h.status === "PENDING_REVIEW" || h.status === "VERIFIED") {
      var controls = el("div", "review-controls");

      var level = null;
      if (h.status === "PENDING_REVIEW") {
        level = el("select");
        level.setAttribute("aria-label", "Verification level");
        [["1", "Level 1: handle ownership confirmed"], ["2", "Level 2: identity confirmed"]].forEach(function (o) {
          var opt = el("option", "", o[1]);
          opt.value = o[0];
          level.appendChild(opt);
        });
        controls.appendChild(level);
      }

      var note = el("input");
      note.type = "text";
      note.maxLength = 500;
      note.placeholder = h.status === "VERIFIED" ? "Reason (required to revoke)" : "Note (required to reject)";
      note.setAttribute("aria-label", "Note");
      controls.appendChild(note);

      var actions = el("div", "handle-actions");

      if (h.status === "PENDING_REVIEW") {
        var approve = button("Approve", "button-primary", function () {
          if (!window.confirm("Approve @" + h.handle + " as verified?")) return;
          act(approve, msg, "Approving…", async function () {
            await api("/handles/" + h.id + "/approve", {
              method: "POST",
              body: JSON.stringify({ level: Number(level.value), note: note.value.trim() }),
            });
            await load();
          });
        });
        var reject = button("Reject", "button-danger", function () {
          if (note.value.trim().length < 3) {
            setMsg(msg, "Add a short reason before rejecting.", "error");
            note.focus();
            return;
          }
          if (!window.confirm("Reject @" + h.handle + "?")) return;
          act(reject, msg, "Rejecting…", async function () {
            await api("/handles/" + h.id + "/reject", {
              method: "POST",
              body: JSON.stringify({ note: note.value.trim() }),
            });
            await load();
          });
        });
        actions.appendChild(approve);
        actions.appendChild(reject);
      } else {
        var revoke = button("Revoke verification", "button-danger", function () {
          if (note.value.trim().length < 3) {
            setMsg(msg, "Add a short reason before revoking.", "error");
            note.focus();
            return;
          }
          if (!window.confirm("Revoke verification for @" + h.handle + "?")) return;
          act(revoke, msg, "Revoking…", async function () {
            await api("/handles/" + h.id + "/revoke", {
              method: "POST",
              body: JSON.stringify({ note: note.value.trim() }),
            });
            await load();
          });
        });
        actions.appendChild(revoke);
      }

      controls.appendChild(actions);
      card.appendChild(controls);
    }

    card.appendChild(msg);
    return card;
  }

  function render(handles) {
    if (!handles.length) {
      queue.replaceChildren(el("p", "handle-note", "Nothing here."));
      return;
    }
    queue.replaceChildren.apply(queue, handles.map(renderCard));
  }

  async function load() {
    queue.replaceChildren(el("p", "handle-note", "Loading…"));
    try {
      var data = await api("/handles?status=" + encodeURIComponent(current));
      render(data.handles);
    } catch (e) {
      queue.replaceChildren(el("p", "field-error", e.message));
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

    var codeForm = document.getElementById("code-form");
  if (codeForm) {
    var codeInput = document.getElementById("code-input");
    var codeResult = document.getElementById("code-result");
    codeForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMsg(codeResult, "Looking up…");
      try {
        var data = await api("/code-lookup?code=" + encodeURIComponent(codeInput.value.trim()));
        if (!data.found) {
          setMsg(codeResult, "No claim uses this code. Anyone who shows it is making it up.", "error");
          return;
        }
        var h = data.handle;
        setMsg(
          codeResult,
          "This code belongs to the claim for @" + h.handle + " (" + (PLATFORM[h.platform] || h.platform) +
            ") by " + h.user.name + ". It is only valid in the bio of " + h.profileUrl,
          "ok"
        );
      } catch (err) {
        setMsg(codeResult, err.message, "error");
      }
    });
  }

  load();
})();