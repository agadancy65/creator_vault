document.querySelectorAll("[data-demo-submit]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const destination = form.dataset.demoSubmit;
    if (destination) {
      window.location.href = destination;
    }
  });
});
