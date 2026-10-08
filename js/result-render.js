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

  // Show the creator's profile photo, with a check badge
  // overlapping its corner, when the result has one.
  // The icon stays in place until the photo has actually
  // loaded, and a photo that fails to load simply leaves
  // the icon where it is.
  const photoWrap = document.querySelector("[data-result-photo]");
  const photoImg =
    photoWrap && photoWrap.querySelector("[data-result-photo-img]");
  const iconEl = document.querySelector("[data-result-icon]");
  if (photoWrap && photoImg && data.photo) {
    photoImg.alt = data.name
      ? `${data.name}'s profile photo`
      : "Creator profile photo";

    const showPhoto = () => {
      photoWrap.hidden = false;
      if (iconEl) iconEl.hidden = true;
    };

    photoImg.addEventListener("load", showPhoto);
    photoImg.addEventListener("error", () => {
      // No photo available; keep the generic icon.
      photoWrap.hidden = true;
    });

    photoImg.src = data.photo;

    // A complete image (for example from cache) may not
    // fire "load" again, so check for it directly.
    if (photoImg.complete && photoImg.naturalWidth > 0) {
      showPhoto();
    }
  }
}
