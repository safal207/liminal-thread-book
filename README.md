# liminal-thread-book

Liminal Thread is a living book + landing page exploring resonant AI, liminality,
and human–machine continuity. The site is a lightweight static experience designed
to evolve alongside the book itself.

## Why it exists

The project documents and tests ideas around liminal states, continuity,
and the L-THREAD / LTP direction — a practical philosophy for building
systems that sustain relationship over time.

## Deployment

The site is deployed on GitHub Pages as a static build (no backend required).

## Forms (contact capture)

Two forms capture early-reader signups and chapter questions. Submissions are sent
to a Formspree endpoint via `fetch` using JSON payloads, with a `type` field to
distinguish each form.

To configure Formspree:
1. Create a new Formspree form and copy the endpoint URL.
2. Update both forms in `index.html`:
   - Replace `action` and `data-endpoint` with your Formspree endpoint.
3. Deploy the site and submit a test message to verify it appears in Formspree.

No secrets are stored in the repo: the endpoint URL lives in the form markup.

## Contributing

Ideas, issues, and improvements are welcome. Open an Issue with context or a
small PR that keeps the site minimal, readable, and durable.
