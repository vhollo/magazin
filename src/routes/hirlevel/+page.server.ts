import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

/**
 * Newsletter subscribe / unsubscribe (homepage redesign 2026, F4).
 *
 * Relays the submission to the prerendered `/hirlevel/form` page so Netlify Forms
 * captures it (same indirection as `/kviz/[...id]` → `/kviz/form`), because a native
 * form POST to this SSR route would hit SvelteKit, not Netlify's form processor.
 */
export const actions: Actions = {
  default: async ({ request, url }) => {
    const formData = await request.formData();

    const email = (formData.get("email") ?? "").toString().trim();
    const muvelet = (formData.get("muvelet") ?? "feliratkozas").toString();
    const consent = formData.get("consent");
    // Netlify honeypot: real users leave `bot-field` empty. Silently succeed for bots.
    if ((formData.get("bot-field") ?? "").toString().trim() !== "") {
      return { success: true, muvelet };
    }

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(400, { emailError: true, email, muvelet });
    }
    // Subscribing requires explicit consent (GDPR); unsubscribing does not.
    if (muvelet === "feliratkozas" && !consent) {
      return fail(400, { consentError: true, email, muvelet });
    }

    let origin = url.origin;
    if (url.origin.includes("localhost") || url.origin.includes("192.168"))
      origin = "https://diabeteshu.netlify.app";

    try {
      const response = await fetch(`${origin}/hirlevel/form`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: (() => {
          const params = new URLSearchParams();
          params.append("form-name", "hirlevel");
          params.append("email", email);
          params.append("nev", (formData.get("nev") ?? "").toString());
          params.append("muvelet", muvelet);
          params.append("consent", consent ? "igen" : "");
          return params.toString();
        })(),
      });

      if (response.status !== 200) {
        console.log("POST /hirlevel/form failed: ", response.status);
        return fail(response.status, { postFail: true, email, muvelet });
      }
    } catch (err) {
      console.log("hirlevel postFail: ", err);
      return fail(500, { postFail: true, email, muvelet });
    }

    return { success: true, muvelet };
  },
};
