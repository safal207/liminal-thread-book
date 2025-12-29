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

  const getPageUrl = () =>
    typeof window !== "undefined" ? window.location.href : "";

  const isRateLimited = (form, now) => {
    const lastSubmitted = Number(form.dataset.lastSubmitted || 0);
    return now - lastSubmitted < RATE_LIMIT_MS;
  };

  const buildPayload = (form, pageUrl = getPageUrl()) => ({
    type: form.dataset.formType || "",
    email: getFieldValue(form, "email"),
    name: getFieldValue(form, "name"),
    source: getFieldValue(form, "source"),
    question: getFieldValue(form, "question"),
    page: pageUrl,
    ts: new Date().toISOString(),
  });

  const sendPayload = async ({ endpoint, payload, fetchImpl = fetch }) => {
    const response = await fetchImpl(endpoint, {
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

    return response;
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

    const now = Date.now();
    if (isRateLimited(form, now)) {
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

    const payload = buildPayload(form);

    try {
      await sendPayload({ endpoint, payload });
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

  if (typeof document !== "undefined") {
    const forms = document.querySelectorAll("form[data-endpoint]");
    forms.forEach((form) => {
      form.addEventListener("submit", handleSubmit);
    });
  }

  const FormHandler = {
    RATE_LIMIT_MS,
    getFieldValue,
    setStatus,
    disableForm,
    isRateLimited,
    buildPayload,
    sendPayload,
  };

  if (typeof window !== "undefined") {
    window.FormHandler = FormHandler;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FormHandler;
  }
})();
