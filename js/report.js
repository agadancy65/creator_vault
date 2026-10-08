// Report flow on flagged results.
//
// Entirely local: reports are recorded in localStorage so the
// prototype can demonstrate the flow end to end without a
// backend. Nothing is sent anywhere.
(function () {
  var actions = document.getElementById("report-actions");
  var toggle = document.getElementById("report-toggle");
  var panel = document.getElementById("report-panel");
  var form = document.getElementById("report-form");
  var success = document.getElementById("report-success");
  if (!actions || !toggle || !panel || !form || !success) return;

  var cancel = document.getElementById("report-cancel");
  var handleEl = document.querySelector("[data-result-handle]");
  var handle = handleEl ? handleEl.textContent.trim() : "";
  var reportedHandle = document.querySelector("[data-report-handle]");

  function open() {
    panel.hidden = false;
    actions.hidden = true;
    var first = form.querySelector("select");
    if (first) first.focus();
  }

  function close() {
    panel.hidden = true;
    actions.hidden = false;
    form.reset();
    // Clear anything validation left behind on the abandoned
    // report, so the form opens pristine next time.
    form.querySelectorAll("[aria-invalid]").forEach(function (el) {
      el.removeAttribute("aria-invalid");
    });
    form.querySelectorAll(".field-error").forEach(function (el) {
      el.textContent = "";
    });
    var summary = form.querySelector(".form-error-summary");
    if (summary) summary.textContent = "";
  }

  toggle.addEventListener("click", open);
  if (cancel) cancel.addEventListener("click", close);

  form.addEventListener("submit", function (event) {
    // form-validation.js stops invalid submits in the capture
    // phase, so reaching here means a reason was chosen.
    event.preventDefault();

    var record = {
      handle: handle,
      reason: form.elements.reason.value,
      details: form.elements.details.value.trim(),
      at: new Date().toISOString(),
    };

    var reports = [];
    try {
      reports = JSON.parse(localStorage.getItem("cv_reports") || "[]");
    } catch (error) {
      reports = [];
    }
    reports.push(record);
    try {
      localStorage.setItem("cv_reports", JSON.stringify(reports));
    } catch (error) {
      /* storage unavailable; the flow still completes */
    }

    if (reportedHandle) reportedHandle.textContent = handle;
    panel.hidden = true;
    success.hidden = false;
  });
})();
