const form = document.querySelector("#search-form");
const input = document.querySelector("#handle-input");

if (form && input) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const handle = input.value.trim();
    if (!handle) return;

    // Real scoring (Levenshtein distance + signals), not a string-contains check.
    const result = scoreHandle(handle);

    // Pass the result to the next page via sessionStorage, since these are
    // separate HTML pages rather than components.
    sessionStorage.setItem("cv_result", JSON.stringify(result));

    const pageByStatus = {
      verified: "pages/verified.html",
      flagged: "pages/flagged.html",
      not_found: "pages/not-found.html",
    };
    window.location.href = pageByStatus[result.status];
  });

  document.querySelectorAll("[data-demo-handle]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.demoHandle;
      input.focus();
    });
  });
}
