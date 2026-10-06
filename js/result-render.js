// Reads the result saved by search.js and fills in the real handle + reasons
// on the verified/flagged/not-found pages, instead of showing hardcoded text.
const data = JSON.parse(sessionStorage.getItem("cv_result") || "null");

if (data) {
  const handleEl = document.querySelector("[data-result-handle]");
  if (handleEl) handleEl.textContent = data.handle;

  const reasonsEl = document.querySelector("[data-result-reasons]");
  if (reasonsEl) {
    reasonsEl.innerHTML = "";
    (data.reasons || []).forEach((reason) => {
      const li = document.createElement("li");
      li.textContent = reason;
      reasonsEl.appendChild(li);
    });
  }

  const matchEl = document.querySelector("[data-matched-handle]");
  if (matchEl) {
    if (data.matchedHandle) {
      matchEl.textContent = `Closest verified match: ${data.matchedHandle}`;
      matchEl.hidden = false;
    } else {
      matchEl.hidden = true;
    }
  }
}
