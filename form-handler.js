const FORM_COOLDOWN_MS = 10000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formCooldowns = new Map();

const getCooldownRemaining = (form) => {
  const lastSentAt = formCooldowns.get(form) ?? 0;
  const now = Date.now();
  return Math.max(0, FORM_COOLDOWN_MS - (now - lastSentAt));
};

const setFeedback = (form, message, tone = "info") => {
  const feedback = form.querySelector(".form-feedback");
  if (!feedback) {
    return;
  }
  feedback.textContent = message;
  feedback.classList.remove("is-success", "is-error");
  if (tone === "success") {
    feedback.classList.add("is-success");
  }
  if (tone === "error") {
    feedback.classList.add("is-error");
  }
};

const setSubmittingState = (form, isSubmitting) => {
  const button = form.querySelector("button[type='submit']");
  if (!button) {
    return;
  }
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Sending..." : button.dataset.defaultLabel;
};

const validateForm = (form) => {
  const emailInput = form.querySelector("input[type='email']");
  const questionInput = form.querySelector("textarea[name='question']");

  if (emailInput) {
    const emailValue = emailInput.value.trim();
    if (!emailValue) {
      emailInput.setCustomValidity("Email is required.");
      emailInput.reportValidity();
      return false;
    }
    if (!emailPattern.test(emailValue)) {
      emailInput.setCustomValidity("Please enter a valid email.");
      emailInput.reportValidity();
      return false;
    }
    emailInput.setCustomValidity("");
  }

  if (questionInput) {
    const questionValue = questionInput.value.trim();
    if (!questionValue) {
      questionInput.setCustomValidity("Please add your question or story.");
      questionInput.reportValidity();
      return false;
    }
    questionInput.setCustomValidity("");
  }

  return true;
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const endpoint = form.dataset.endpoint;

  if (!endpoint) {
    setFeedback(form, "Missing form endpoint. Please try again later.", "error");
    return;
  }

  const cooldownRemaining = getCooldownRemaining(form);
  if (cooldownRemaining > 0) {
    setFeedback(
      form,
      `Please wait ${Math.ceil(cooldownRemaining / 1000)}s before trying again.`,
      "error"
    );
    return;
  }

  const honeypot = form.querySelector("input[name='website']");
  if (honeypot && honeypot.value.trim()) {
    setFeedback(form, "✅ Sent. You're in.", "success");
    form.reset();
    return;
  }

  if (!validateForm(form)) {
    setFeedback(form, "Please fix the highlighted fields and try again.", "error");
    return;
  }

  setSubmittingState(form, true);
  setFeedback(form, "Sending...");

  const formData = new FormData(form);
  const payload = {
    type: form.dataset.type || "form_submission",
    email: formData.get("email")?.toString().trim() || "",
    name: formData.get("name")?.toString().trim() || "",
    source: formData.get("source")?.toString().trim() || "",
    question: formData.get("question")?.toString().trim() || "",
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
      throw new Error(`Request failed (${response.status})`);
    }

    formCooldowns.set(form, Date.now());
    setFeedback(form, "✅ Sent. You're in.", "success");
    form.reset();
  } catch (error) {
    setFeedback(
      form,
      "Something went wrong while sending. Please try again in a moment.",
      "error"
    );
  } finally {
    setSubmittingState(form, false);
  }
};

document.querySelectorAll("form.form").forEach((form) => {
  form.addEventListener("submit", handleSubmit);
});
