import { fail } from "@sveltejs/kit";
import { FieldValue } from "firebase-admin/firestore";
import type { Actions } from "./$types";
import { db } from "$lib/firebase-admin";
import { formRelayOrigin } from "$lib/server/formRelay";

/** Subscriber list (Rowy table). One doc per address, doc id = lowercased email. */
const SUBSCRIBERS = "tables/elofizetok/hirlevel";

/**
 * Newsletter subscribe / unsubscribe (homepage redesign 2026, F4).
 *
 * Relays the submission to the prerendered `/hirlevel/form` page so Netlify Forms
 * captures it (same indirection as `/kviz/[...id]` → `/kviz/form`), because a native
 * form POST to this SSR route would hit SvelteKit, not Netlify's form processor.
 * After a successful relay the subscriber list in Firestore is updated with the
 * admin SDK (same order as the quiz score write): subscribe sets the doc,
 * unsubscribe deletes it.
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

    // No `/` allowed: the address becomes a Firestore doc id.
    if (!email || !/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email)) {
      return fail(400, { emailError: true, email, muvelet });
    }
    // Subscribing requires explicit consent (GDPR); unsubscribing does not.
    if (muvelet === "feliratkozas" && !consent) {
      return fail(400, { consentError: true, email, muvelet });
    }

    try {
      const origin = formRelayOrigin(url);
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

    try {
      const docRef = db.doc(`${SUBSCRIBERS}/${email.toLowerCase()}`);
      if (muvelet === "leiratkozas") {
        // Deleting a missing doc is a no-op, so the response never reveals
        // whether the address was on the list.
        await docRef.delete();
      } else {
        await docRef.set(
          {
            email,
            nev: (formData.get("nev") ?? "").toString().trim(),
            consent: true,
            date: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch (err) {
      console.log("hirlevel Firestore write failed: ", err);
      return fail(500, { postFail: true, email, muvelet });
    }

    return { success: true, muvelet };
  },
};
