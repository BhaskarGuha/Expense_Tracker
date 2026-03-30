const loginForm = document.getElementById("loginForm");
const messageEl = document.getElementById("message");

const showMessage = (text, type = "error") => {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Basic frontend validation before sending request.
  if (!email || !password) {
    return showMessage("Please fill in all required fields.");
  }
  if (!isValidEmail(email)) {
    return showMessage("Please enter a valid email address.");
  }
  if (password.length < 6) {
    return showMessage("Password must be at least 6 characters.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      return showMessage(data.message || "Login failed.");
    }

    localStorage.setItem("token", data.token);
    showMessage("Login successful. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 700);
  } catch (error) {
    showMessage("Network error. Please try again.");
  }
});
