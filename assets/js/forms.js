const FORM_COOLDOWN_MS = 10000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_TYPE = "form_submission";
const FORM_SELECTOR = "form.form";
const HONEYPOT_SELECTOR = "input[name='website']";
const EMAIL_SELECTOR = "input[type='email']";
const QUESTION_SELECTOR = "textarea[name='question']";
const SUBMIT_SELECTOR = "button[type='submit']";
const FEEDBACK_SELECTOR = ".form-feedback";
const DATASET_ENDPOINT = "endpoint";
const DATASET_TYPE = "formType";

const FORM_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

const MESSAGE = {
  MISSING_ENDPOINT: "Missing form endpoint. Please try again later.",
  INVALID_FIELDS: "Please fix the highlighted fields and try again.",
  COOLDOWN: (seconds) => `Please wait ${seconds}s before trying again.`,
  HONEYPOT_SUCCESS: "✅ Sent. You're in.",
  SENDING: "Sending...",
  SUCCESS: "✅ Sent. You're in.",
  FAILURE: "Something went wrong while sending. Please try again in a moment.",
};

const formCooldowns = new Map();

const getCooldownRemaining = (form) => {
  const lastSentAt = formCooldowns.get(form) ?? 0;
  const now = Date.now();
  return Math.max(0, FORM_COOLDOWN_MS - (now - lastSentAt));
};

const setFeedback = (form, message, tone = "info") => {
  const feedback = form.querySelector(FEEDBACK_SELECTOR);
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
  const button = form.querySelector(SUBMIT_SELECTOR);
  if (!button) {
    return;
  }
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Sending..." : button.dataset.defaultLabel;
};

const setFormState = (form, state) => {
  form.dataset.state = state;
};

const validateForm = (form) => {
  const emailInput = form.querySelector(EMAIL_SELECTOR);
  const questionInput = form.querySelector(QUESTION_SELECTOR);

  if (emailInput) {
    const emailValue = emailInput.value.trim();
    if (!emailValue) {
      emailInput.setCustomValidity("Email is required.");
      emailInput.reportValidity();
      return false;
    }
    if (!EMAIL_PATTERN.test(emailValue)) {
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
  const endpoint = form.dataset[DATASET_ENDPOINT];

  if (!endpoint) {
    setFormState(form, FORM_STATES.ERROR);
    setFeedback(form, MESSAGE.MISSING_ENDPOINT, "error");
    return;
  }

  const cooldownRemaining = getCooldownRemaining(form);
  if (cooldownRemaining > 0) {
    setFormState(form, FORM_STATES.ERROR);
    setFeedback(
      form,
      MESSAGE.COOLDOWN(Math.ceil(cooldownRemaining / 1000)),
      "error"
    );
    return;
  }

  const honeypot = form.querySelector(HONEYPOT_SELECTOR);
  if (honeypot && honeypot.value.trim()) {
    setFormState(form, FORM_STATES.SUCCESS);
    setFeedback(form, MESSAGE.HONEYPOT_SUCCESS, "success");
    form.reset();
    return;
  }

  if (!validateForm(form)) {
    setFormState(form, FORM_STATES.ERROR);
    setFeedback(form, MESSAGE.INVALID_FIELDS, "error");
    return;
  }

  setFormState(form, FORM_STATES.LOADING);
  setSubmittingState(form, true);
  setFeedback(form, MESSAGE.SENDING);

  const formData = new FormData(form);
  const payload = {
    type: form.dataset[DATASET_TYPE] || DEFAULT_TYPE,
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
    setFormState(form, FORM_STATES.SUCCESS);
    setFeedback(form, MESSAGE.SUCCESS, "success");
    form.reset();
  } catch (error) {
    setFormState(form, FORM_STATES.ERROR);
    setFeedback(
      form,
      MESSAGE.FAILURE,
      "error"
    );
  } finally {
    setSubmittingState(form, false);
    if (form.dataset.state !== FORM_STATES.SUCCESS) {
      setFormState(form, FORM_STATES.IDLE);
    }
  }
};

document.querySelectorAll(FORM_SELECTOR).forEach((form) => {
  setFormState(form, FORM_STATES.IDLE);
  form.addEventListener("submit", handleSubmit);
});
