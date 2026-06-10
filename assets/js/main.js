/* =========================================================
   BOSSABABY — EMAIL SIGNUP (Formspree)
   Setup (one time):
     1. Create a free account at https://formspree.io
     2. Create a new form, copy its endpoint URL
        (looks like https://formspree.io/f/abcd1234)
     3. Paste it below as FORM_ENDPOINT
   Until then, the form shows a friendly "noted" message
   but does NOT store the email anywhere.
   ========================================================= */
const FORM_ENDPOINT = "";

const form = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const message = document.getElementById("signup-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  if (!email || !emailInput.checkValidity()) {
    showMessage("Please enter a valid email address.", "error");
    return;
  }

  if (!FORM_ENDPOINT) {
    // Placeholder mode: no service configured yet.
    showMessage("Thanks for your interest! Signups open very soon — check back shortly. 💛", "success");
    form.reset();
    return;
  }

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) throw new Error("Request failed");

    showMessage("You're on the list! See you at launch. 💛", "success");
    form.reset();
  } catch {
    showMessage("Something went wrong — please try again in a moment.", "error");
  }
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = "signup-message " + type;
}
