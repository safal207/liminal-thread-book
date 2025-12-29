(() => {
  const RATE_LIMIT_MS = 10000;

  const getFieldValue = (form, name) => {
    const field = form.querySelector(`[name="${name}"]`);
    return field ? field.value.trim() : "";
  };

  const setStatus = (form, message, status) => {
    const statusEl = form.querySelector(".form-status");
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.remove("success", "error");
    if (status) {
      statusEl.classList.add(status);
    }
  };

  const disableForm = (form, disabled) => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) {
      return;
    }
    if (disabled) {
      button.dataset.originalText = button.textContent;
      button.textContent = "Sending...";
    } else if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
    button.disabled = disabled;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      setStatus(form, "Missing form endpoint configuration.", "error");
      return;
    }

    const honeypot = getFieldValue(form, "website");
    if (honeypot) {
      setStatus(form, "Submission blocked.", "error");
      return;
    }

    const lastSubmitted = Number(form.dataset.lastSubmitted || 0);
    const now = Date.now();
    if (now - lastSubmitted < RATE_LIMIT_MS) {
      setStatus(form, "Please wait a few seconds before trying again.", "error");
      return;
    }

    const emailField = form.querySelector('input[type="email"]');
    if (emailField && !emailField.checkValidity()) {
      emailField.reportValidity();
      setStatus(form, "Please enter a valid email.", "error");
      return;
    }

    const questionField = form.querySelector('[name="question"]');
    if (questionField && !questionField.checkValidity()) {
      questionField.reportValidity();
      setStatus(form, "Please add your question or story.", "error");
      return;
    }

    disableForm(form, true);
    setStatus(form, "Sending...", "");

    const payload = {
      type: form.dataset.formType || "",
      email: getFieldValue(form, "email"),
      name: getFieldValue(form, "name"),
      source: getFieldValue(form, "source"),
      question: getFieldValue(form, "question"),
      page: window.location.href,
      ts: new Date().toISOString(),
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = response.status
          ? `Server error (${response.status}). Please try again later.`
          : "Something went wrong. Please try again.";
        throw new Error(errorText);
      }

      form.dataset.lastSubmitted = String(Date.now());
      form.reset();
      setStatus(form, "✅ Sent / You’re in", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error.";
      setStatus(form, message, "error");
    } finally {
      disableForm(form, false);
    }
  };

  const forms = document.querySelectorAll("form[data-endpoint]");
  forms.forEach((form) => {
    form.addEventListener("submit", handleSubmit);
  });
})();
