# liminal-thread-book

## Formspree setup (GitHub Pages contact capture)

1. Create a new Formspree form and copy the endpoint URL.
2. Update both forms in `index.html`:
   - Replace `action` and `data-endpoint` with your Formspree endpoint.
3. Deploy the site and submit a test message to verify it appears in Formspree.

Notes:
- The endpoint is stored in `data-endpoint` attributes (no secrets in the repo).
- The client sends JSON payloads with a `type` field to distinguish the two forms.
