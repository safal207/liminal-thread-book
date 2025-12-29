# Testing

## Manual checklist

- [ ] With JavaScript enabled and the endpoint reachable, the form submits via fetch and shows a success message.
- [ ] When the fetch call fails (network error or non-OK response), the form falls back to a standard HTML POST to the `action` URL.
- [ ] With JavaScript disabled, the form submits via the native HTML POST to the `action` URL.
