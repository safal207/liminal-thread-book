const assert = require("assert");
const {
  RATE_LIMIT_MS,
  getFieldValue,
  setStatus,
  disableForm,
  isRateLimited,
  buildFormData,
  sendFormData,
} = require("../form-handler.js");

class FormDataStub {
  constructor(form) {
    this.form = form;
    this.fields = {};
  }

  append(key, value) {
    if (!this.fields[key]) {
      this.fields[key] = [];
    }
    this.fields[key].push(value);
  }

  getAll(key) {
    return this.fields[key] || [];
  }
}

const createClassList = () => {
  const classes = new Set();
  return {
    add: (name) => classes.add(name),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toArray: () => Array.from(classes),
  };
};

const createForm = ({ fields = {}, statusText = "", buttonText = "Submit" } = {}) => {
  const statusEl = {
    textContent: statusText,
    classList: createClassList(),
  };
  const submitButton = {
    textContent: buttonText,
    disabled: false,
    dataset: {},
  };
  const form = {
    dataset: {},
    querySelector: (selector) => {
      if (selector === ".form-status") {
        return statusEl;
      }
      if (selector === 'button[type="submit"]') {
        return submitButton;
      }
      if (selector === 'input[type="email"]') {
        return fields.email;
      }
      if (selector === '[name="question"]') {
        return fields.question;
      }
      const nameMatch = selector.match(/^\[name="(.+)"\]$/);
      if (nameMatch) {
        return fields[nameMatch[1]];
      }
      return null;
    },
  };

  return { form, statusEl, submitButton };
};

const run = async () => {
  {
    const { form } = createForm({
      fields: {
        email: { value: "  user@example.com  " },
      },
    });
    assert.strictEqual(getFieldValue(form, "email"), "user@example.com");
  }

  {
    const { form, statusEl } = createForm();
    setStatus(form, "Sent!", "success");
    assert.strictEqual(statusEl.textContent, "Sent!");
    assert.ok(statusEl.classList.contains("success"));
  }

  {
    const { form, submitButton } = createForm();
    disableForm(form, true);
    assert.strictEqual(submitButton.disabled, true);
    assert.strictEqual(submitButton.textContent, "Sending...");
    disableForm(form, false);
    assert.strictEqual(submitButton.disabled, false);
    assert.strictEqual(submitButton.textContent, "Submit");
  }

  {
    const { form, statusEl } = createForm();
    setStatus(form, "Oops", "error");
    assert.strictEqual(statusEl.textContent, "Oops");
    assert.ok(statusEl.classList.contains("error"));
    setStatus(form, "All good", "success");
    assert.ok(statusEl.classList.contains("success"));
    assert.ok(!statusEl.classList.contains("error"));
  }

  {
    const { form } = createForm();
    form.dataset.lastSubmitted = String(Date.now() - RATE_LIMIT_MS + 1000);
    assert.ok(isRateLimited(form, Date.now()));
  }

  {
    const { form } = createForm();
    form.dataset.lastSubmitted = String(Date.now() - RATE_LIMIT_MS - 1000);
    assert.ok(!isRateLimited(form, Date.now()));
  }

  {
    const { form } = createForm({
      fields: {
        email: { value: "person@example.com" },
        name: { value: "Ada" },
        source: { value: "twitter" },
        question: { value: "What inspired the book?" },
      },
    });
    form.dataset.formType = "chapter_question";
    const formData = buildFormData(
      form,
      "https://example.test/page",
      FormDataStub
    );
    assert.strictEqual(formData.getAll("type")[0], "chapter_question");
    assert.strictEqual(formData.getAll("page")[0], "https://example.test/page");
    assert.ok(formData.getAll("ts")[0]);
  }

  {
    const { form } = createForm({
      fields: {
        email: { value: "hello@example.com" },
      },
    });
    const formData = buildFormData(form, "", FormDataStub);
    assert.strictEqual(formData.getAll("page")[0], "");
  }

  {
    const calls = [];
    const fetchStub = async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { ok: true };
    };
    const formData = new FormDataStub();
    await sendFormData({
      endpoint: "https://formspree.io/f/example",
      formData,
      fetchImpl: fetchStub,
    });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].endpoint, "https://formspree.io/f/example");
    assert.strictEqual(calls[0].options.method, "POST");
    assert.strictEqual(calls[0].options.headers.Accept, "application/json");
    assert.strictEqual(calls[0].options.body, formData);
  }

  {
    const fetchStub = async () => ({ ok: false, status: 500 });
    await sendFormData({
      endpoint: "https://formspree.io/f/example",
      formData: new FormDataStub(),
      fetchImpl: fetchStub,
    })
      .then(() => {
        throw new Error("Expected sendFormData to reject");
      })
      .catch((error) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(
          error.message,
          "Server error (500). Please try again later."
        );
      });
  }
};

run()
  .then(() => {
    console.log("form-handler tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
