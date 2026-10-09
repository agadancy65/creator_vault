async function cvApi(path, body) {
  var res = await fetch("/api/auth/" + path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    var err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function cvShowError(form, message) {
  var box = form.querySelector(".form-error-summary");
  if (!box) return;
  box.textContent = message || "";
  box.hidden = !message;
}

async function cvGet(path) {
  var res = await fetch("/api/auth/" + path, { credentials: "same-origin" });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    var err = new Error(data.error || "Something went wrong.");
    err.status = res.status;
    throw err;
  }
  return data;
}