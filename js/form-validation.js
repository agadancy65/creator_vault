// Declarative, accessible form validation.
//
// Rules are declared on each input as a space separated list in
// data-rules:
//   required   the field must not be empty
//   email      a plausible email address
//   password   at least 8 characters
//   handle     letters, numbers, underscores and dots, optional leading @
//   digits     digits only
//   min:N      at least N characters
//   max:N      at most N characters
//   confirm    must match the field named in data-confirm
//
// Any rule can be overridden per field with data-msg-<rule>, which
// keeps messages specific to the field ("Enter the 10-digit account
// number" rather than a generic "Use at least 10 characters.").
//
// Each input also needs an empty error element; the id is derived
// from the input's id (or name) plus "-error":
//   <input id="email" ...>
//   <span class="field-error" id="email-error" role="alert"></span>
// The wiring between the two is done here, so it cannot drift.
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var HANDLE = /^[@]?[A-Za-z0-9_][A-Za-z0-9_.]{0,29}$/;

  var CHECKS = {
    required: function (value) {
      return value.trim().length > 0 || "This field is required.";
    },
    email: function (value) {
      return (
        !value.trim() ||
        EMAIL.test(value.trim()) ||
        "Enter a valid email address, such as you@example.com."
      );
    },
    password: function (value) {
      return value.length >= 8 || "Use at least 8 characters.";
    },
    handle: function (value) {
      return (
        !value.trim() ||
        HANDLE.test(value.trim()) ||
        "Letters, numbers, underscores and dots only, with an optional leading @."
      );
    },
    digits: function (value) {
      return !value.trim() || /^[0-9]+$/.test(value.trim()) || "Numbers only.";
    },
  };

  function messageFor(input, rule, fallback) {
    var custom = input.getAttribute("data-msg-" + rule);
    return custom || fallback;
  }

  function validate(input) {
    var rules = (input.getAttribute("data-rules") || "")
      .split(/\s+/)
      .filter(Boolean);

    for (var i = 0; i < rules.length; i++) {
      var token = rules[i];
      var name = token;
      var arg = null;
      var colon = token.indexOf(":");
      if (colon !== -1) {
        name = token.slice(0, colon);
        arg = token.slice(colon + 1);
      }

      if (name === "min") {
        var min = parseInt(arg, 10);
        if (input.value.length < min) {
          return messageFor(
            input,
            "min",
            "Use at least " + min + " characters.",
          );
        }
        continue;
      }

      if (name === "max") {
        var max = parseInt(arg, 10);
        if (input.value.length > max) {
          return messageFor(
            input,
            "max",
            "Use at most " + max + " characters.",
          );
        }
        continue;
      }

      if (name === "confirm") {
        var other =
          input.form && input.form.elements[input.getAttribute("data-confirm")];
        if (other && input.value !== other.value) {
          return (
            input.getAttribute("data-msg-confirm") ||
            "Does not match the " + (other.name || "previous field") + "."
          );
        }
        continue;
      }

      var check = CHECKS[name];
      if (check) {
        var result = check(input.value);
        if (result !== true) {
          return messageFor(input, name, result);
        }
      }
    }
    return null;
  }

  // The error element for an input, found by the convention above.
  function errorFor(input) {
    var form = input.form;
    var key = input.id || input.name;
    if (!form || !key) return null;
    return form.querySelector('[id="' + key + '-error"]');
  }

  function showError(input, message) {
    var error = errorFor(input);
    if (error) error.textContent = message || "";
    if (message) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function fields(form) {
    return Array.prototype.slice.call(form.querySelectorAll("[data-rules]"));
  }

  function validateForm(form) {
    var firstInvalid = null;
    var messages = [];

    fields(form).forEach(function (input) {
      var message = validate(input);
      showError(input, message);
      if (message) {
        if (!firstInvalid) firstInvalid = input;
        messages.push({ input: input, message: message });
      }
    });

    return {
      ok: messages.length === 0,
      firstInvalid: firstInvalid,
      messages: messages,
    };
  }

  // A summary is only rendered where the form has one. It lists every
  // failure and links to the field, so keyboard and screen reader users
  // can jump straight to the problem instead of hunting for it.
  function renderSummary(form, result) {
    var summary = form.querySelector(".form-error-summary");
    if (!summary) return;

    if (result.ok) {
      summary.textContent = "";
      return;
    }

    while (summary.firstChild) summary.removeChild(summary.firstChild);

    var heading = document.createElement("p");
    heading.textContent =
      result.messages.length === 1
        ? "Fix this before continuing:"
        : "Fix " + result.messages.length + " things before continuing:";
    summary.appendChild(heading);

    var list = document.createElement("ul");
    result.messages.forEach(function (item) {
      var item_ = document.createElement("li");
      var link = document.createElement("a");
      if (item.input.id) link.href = "#" + item.input.id;
      link.textContent = item.message;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        item.input.focus();
      });
      item_.appendChild(link);
      list.appendChild(item_);
    });
    summary.appendChild(list);

    summary.focus();
  }

  function initForm(form) {
    var inputs = fields(form);

    inputs.forEach(function (input) {
      // Point the input at its own message so assistive tech reads it
      // as the field's description.
      var error = errorFor(input);
      if (error && input.id) input.setAttribute("aria-describedby", error.id);

      // Re-check while correcting, so an error clears the moment the
      // field becomes valid rather than lingering until the next submit.
      input.addEventListener("input", function () {
        var message = validate(input);
        showError(input, message);
        if (!message) renderSummary(form, { ok: true, messages: [] });
      });

      // Only flag on blur once the field has content, so a required
      // field does not error before the user has typed anything.
      input.addEventListener("blur", function () {
        if (input.value) showError(input, validate(input));
      });
    });

    // Capture phase: this runs before the demo navigation handler, so an
    // invalid submit is stopped before the page changes.
    form.addEventListener(
      "submit",
      function (event) {
        var result = validateForm(form);
        if (result.ok) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        renderSummary(form, result);
      },
      true,
    );
  }

  document.querySelectorAll("form[data-validate]").forEach(initForm);
})();
