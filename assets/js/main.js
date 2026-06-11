/* =========================================================
   BOSSABABY — EMAIL SIGNUP (Formspree)
   Submits via AJAX to the Formspree endpoint below. The
   <form action> in index.html points at the same endpoint
   so signups still work if JavaScript is disabled.
   ========================================================= */
const FORM_ENDPOINT = "https://formspree.io/f/mvznqkqz";

// Bilingual UI messages — picked from the page's <html lang="..."> attribute.
const FR = document.documentElement.lang === "fr";
const MSG = {
  invalid: FR
    ? "Veuillez entrer une adresse courriel valide."
    : "Please enter a valid email address.",
  success: FR
    ? "Vous êtes sur la liste! Votre code de 15 % arrivera par courriel. 💛"
    : "You're on the list! Your 15% launch code will arrive by email. 💛",
  error: FR
    ? "Une erreur s'est produite — veuillez réessayer dans un instant."
    : "Something went wrong — please try again in a moment.",
};

const form = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const submitButton = form.querySelector("button[type=submit]");
const message = document.getElementById("signup-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  if (!email || !emailInput.checkValidity()) {
    showMessage(MSG.invalid, "error");
    return;
  }

  submitButton.disabled = true;

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      showMessage(MSG.success, "success");
      form.reset();
    } else {
      // Surface Formspree's validation message when it sends one.
      const data = await response.json().catch(() => null);
      const detail = data && data.errors
        ? data.errors.map((e) => e.message).join(", ")
        : MSG.error;
      showMessage(detail, "error");
    }
  } catch {
    showMessage(MSG.error, "error");
  } finally {
    submitButton.disabled = false;
  }
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = "signup-message " + type;
}
