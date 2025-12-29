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

  const buildFormData = (form, pageUrl = getPageUrl(), formDataImpl = FormData) => {
    const formData = new formDataImpl(form);
    formData.append("type", form.dataset.formType || "");
    formData.append("page", pageUrl);
    formData.append("ts", new Date().toISOString());
    return formData;
  };

  const getErrorMessage = (status) => {
    if (!status) {
      return "Network error. Please try again.";
    }
    if (status === 401 || status === 403) {
      return "Forbidden. Please check the form endpoint.";
    }
    if (status === 404) {
      return "Invalid endpoint. Please verify the form action URL.";
    }
    return `Server error (${status}). Please try again later.`;
  };

  const sendFormData = async ({ endpoint, formData, fetchImpl = fetch }) => {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    if (typeof console !== "undefined" && console.info) {
      console.info("[FormHandler] submit response", {
        endpoint,
        status: response.status,
        ok: response.ok,
        response,
      });
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(response.status));
    }

    return response;
  };

  const fallbackToNativeSubmit = (form) => {
    form.dataset.nativeSubmit = "1";
    form.submit();
  };

  const handleSubmit = async (event) => {
    const form = event.currentTarget;
    if (form.dataset.nativeSubmit === "1") {
      return;
    }

    const endpoint = form.dataset.endpoint;
    if (
      !endpoint ||
      typeof fetch !== "function" ||
      typeof FormData !== "function"
    ) {
      return;
    }

    event.preventDefault();

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

    const formData = buildFormData(form);

    try {
      await sendFormData({ endpoint, formData });
      form.dataset.lastSubmitted = String(Date.now());
      form.reset();
      setStatus(form, "✅ Sent / You’re in", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error.";
      setStatus(
        form,
        `${message} Falling back to standard submit...`,
        "error"
      );
      if (typeof console !== "undefined" && console.info) {
        console.info("[FormHandler] fallback to native submit", {
          endpoint,
          message,
        });
      }
      fallbackToNativeSubmit(form);
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
    buildFormData,
    sendFormData,
  };

  if (typeof window !== "undefined") {
    window.FormHandler = FormHandler;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FormHandler;
  }
})();
