# liminal-thread-book

## Formspree setup

The signup and questions forms submit via client-side JavaScript using
`FormData` (multipart form submissions) with `Accept: application/json`. To wire
them up with Formspree, create a form endpoint and paste it into the
`data-endpoint` attribute for each form in `index.html`.

### 1) Create a Formspree form

1. Go to https://formspree.io and create an account.
2. Create a new form and copy the endpoint URL (looks like
   `https://formspree.io/f/your-form-id`).

### 2) Configure the endpoint in `index.html`

Update both forms in `index.html`:

```html
<form
  class="form"
  action="https://formspree.io/f/your-form-id"
  method="POST"
  data-endpoint="https://formspree.io/f/your-form-id"
  data-form-type="early_circle_signup"
>
```

Repeat for the questions form (`data-form-type="chapter_question"`).

The script augments each submission with `type` (from `data-form-type`), `page`
(current URL), and `ts` (ISO timestamp) fields in the `FormData` payload so you
can distinguish the source of each entry.

### 3) Verify incoming submissions

Formspree will show submissions in your dashboard, and you can enable email
notifications or integrations from the Formspree settings page.
