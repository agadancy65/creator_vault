// Applies the saved theme as early as possible (this script is loaded in
// <head>, before the page body renders) so there's no flash of the wrong theme.
(function () {
  const saved = localStorage.getItem("cv-theme");
  if (saved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();

// Wires up the toggle button once the page has loaded.
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const setIcon = () => {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    btn.textContent = isLight ? "☀️" : "🌙";
    btn.setAttribute(
      "aria-label",
      isLight ? "Switch to dark theme" : "Switch to light theme",
    );
  };
  setIcon();

  btn.addEventListener("click", () => {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("cv-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("cv-theme", "light");
    }
    setIcon();
  });
});
