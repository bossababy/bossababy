/* =========================================================
   BOSSABABY — EMAIL SIGNUP (Formspree)
   Submits via AJAX to the Formspree endpoint below. The
   <form action> in index.html points at the same endpoint
   so signups still work if JavaScript is disabled.
   ========================================================= */
const FORM_ENDPOINT = "https://formspree.io/f/mvznqkqz";

const form = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const submitButton = form.querySelector("button[type=submit]");
const message = document.getElementById("signup-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  if (!email || !emailInput.checkValidity()) {
    showMessage("Please enter a valid email address.", "error");
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
      showMessage("You're on the list! Your 15% launch code will arrive by email. 💛", "success");
      form.reset();
    } else {
      // Surface Formspree's validation message when it sends one.
      const data = await response.json().catch(() => null);
      const detail = data && data.errors
        ? data.errors.map((e) => e.message).join(", ")
        : "Something went wrong — please try again in a moment.";
      showMessage(detail, "error");
    }
  } catch {
    showMessage("Something went wrong — please try again in a moment.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = "signup-message " + type;
}
