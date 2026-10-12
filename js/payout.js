(function () {
  var form = document.getElementById("payout-form");
  if (!form) return;

  var area = document.getElementById("payout-area");
  var orgNote = document.getElementById("org-note");
  if (sessionStorage.getItem("cv_account_type") === "org") {
    area.hidden = true;
    orgNote.hidden = false;
    return;
  }

  var bank = document.getElementById("bank");
  var number = document.getElementById("account-number");
  var errorEl = document.getElementById("account-error");
  var btn = document.getElementById("payout-btn");
  var linked = document.getElementById("payout-linked");
  var skip = document.getElementById("skip-link");
  var removeBtn = document.getElementById("remove-btn");
  var removeMsg = document.getElementById("remove-msg");
  var BANK = { ECOBANK: "Ecobank Nigeria" };

  function set(id, text) {
    document.getElementById(id).textContent = text;
  }

  async function call(options) {
    var opts = Object.assign(
      { credentials: "same-origin", headers: { "Content-Type": "application/json" } },
      options || {}
    );
    var res = await fetch("/api/payout", opts);
    var data = {};
    try {
      data = await res.json();
    } catch (e) {}
    if (res.status === 401) {
      window.location.href = "login.html";
      throw new Error("Please log in.");
    }
    if (res.status === 403) throw new Error("Only creator accounts can add payout details.");
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  function showLinked(p) {
    set("linked-bank", BANK[p.bank] || p.bank);
    set("linked-number", p.accountNumberMasked);
    set("linked-name", p.accountName);
    form.hidden = true;
    skip.hidden = true;
    linked.hidden = false;
  }

  function showForm() {
    linked.hidden = true;
    form.hidden = false;
    skip.hidden = false;
    number.value = "";
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorEl.textContent = "";
    number.removeAttribute("aria-invalid");

    var value = number.value.trim();
    if (!/^\d{10}$/.test(value)) {
      errorEl.textContent = "Enter the full 10-digit account number.";
      number.setAttribute("aria-invalid", "true");
      number.focus();
      return;
    }

    btn.disabled = true;
    btn.classList.add("is-loading");
    try {
      var data = await call({
        method: "POST",
        body: JSON.stringify({ bank: bank.value, accountNumber: value }),
      });
      showLinked(data.payout);
    } catch (err) {
      errorEl.textContent = err.message;
      number.setAttribute("aria-invalid", "true");
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  });

  removeBtn.addEventListener("click", async function () {
    if (!window.confirm("Remove this payout account? Your handles will drop back to Level 1.")) return;
    removeBtn.disabled = true;
    removeBtn.classList.add("is-loading");
    removeMsg.textContent = "";
    try {
      await call({ method: "DELETE" });
      showForm();
    } catch (err) {
      removeMsg.textContent = err.message;
      removeMsg.className = "handle-msg is-error";
    } finally {
      removeBtn.classList.remove("is-loading");
      removeBtn.disabled = false;
    }
  });

  call()
    .then(function (data) {
      set("registered-name", data.registeredName);
      document.getElementById("mock-note").hidden = !data.mock;
      if (data.payout) showLinked(data.payout);
    })
    .catch(function (e) {
      errorEl.textContent = e.message;
    });
})();