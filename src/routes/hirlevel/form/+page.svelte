<!--
  Hidden static form for Netlify Forms bot-detection (homepage redesign 2026, F4).
  Mirrors /kviz/form: the visible /hirlevel form relays its POST here via a server
  action, and Netlify captures the submission because this prerendered page carries
  a matching `data-netlify` form. Declare exactly the fields the server relays
  (spam/honeypot filtering happens server-side in /hirlevel/+page.server.ts, so
  `bot-field` is never forwarded here). Keep field names in sync with /hirlevel.
-->
<form data-netlify="true" name="hirlevel" class="hidden">
  <input name="email" />
  <input name="nev" />
  <input name="muvelet" />
  <input name="consent" />
</form>
