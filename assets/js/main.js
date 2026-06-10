/* =========================================================
   BOSSABABY — EMAIL SIGNUP
   The email service hasn't been chosen yet. When it is,
   set FORM_ENDPOINT below and the form starts submitting
   for real. Examples:
     Formspree:  "https://formspree.io/f/YOUR_FORM_ID"
     Any service that accepts a POST with an "email" field.
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
