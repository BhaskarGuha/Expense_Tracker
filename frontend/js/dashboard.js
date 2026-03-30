const messageEl = document.getElementById("message");
const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const expenseForm = document.getElementById("expenseForm");
const expenseList = document.getElementById("expenseList");
const totalExpensesEl = document.getElementById("totalExpenses");
const totalAmountEl = document.getElementById("totalAmount");
const expenseChart = document.getElementById("expenseChart");
const graphHintEl = document.getElementById("graphHint");

const showMessage = (text, type = "error") => {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
};

// Read API response safely even when server returns non-JSON (like HTML errors).
const parseResponse = async (response) => {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { message: raw || "Unexpected server response." };
  }
};

const token = localStorage.getItem("token");
let currentExpenses = [];
const dateInput = document.getElementById("date");

// Default expense date to today for faster daily entry.
dateInput.value = new Date().toISOString().split("T")[0];

// Protect the dashboard: redirect to login if no token is present.
if (!token) {
  window.location.href = "./index.html";
}

const loadUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      localStorage.removeItem("token");
      showMessage(data.message || "Session expired. Please login again.");
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 1000);
      return;
    }

    userNameEl.textContent = data.user.name;
    userEmailEl.textContent = data.user.email;
    showMessage("Welcome! You are logged in.", "success");
  } catch (error) {
    showMessage("Could not load user data.");
  }
};

const formatCurrency = (amount) => {
  return `INR ${Number(amount).toFixed(2)}`;
};

const updateSummary = () => {
  const totalAmount = currentExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  totalExpensesEl.textContent = currentExpenses.length;
  totalAmountEl.textContent = formatCurrency(totalAmount);
};

const drawExpenseLevelGraph = () => {
  if (!expenseChart) {
    return;
  }

  const ctx = expenseChart.getContext("2d");
  const width = expenseChart.width;
  const height = expenseChart.height;
  ctx.clearRect(0, 0, width, height);

  if (!currentExpenses.length) {
    graphHintEl.textContent = "Add expenses to generate graph";
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Segoe UI";
    ctx.fillText("No expense data yet", 14, 24);
    return;
  }

  const amounts = currentExpenses.map((item) => Number(item.amount));
  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  const spread = maxAmount - minAmount;

  // Dynamic thresholds from user's own data range.
  const lowCutoff = minAmount + spread / 3;
  const mediumCutoff = minAmount + (spread * 2) / 3;

  let low = 0;
  let medium = 0;
  let high = 0;

  amounts.forEach((amt) => {
    if (amt <= lowCutoff) {
      low += 1;
    } else if (amt <= mediumCutoff) {
      medium += 1;
    } else {
      high += 1;
    }
  });

  const data = [
    { label: "Low", value: low, color: "#16a34a" },
    { label: "Medium", value: medium, color: "#f59e0b" },
    { label: "High", value: high, color: "#dc2626" },
  ];

  const maxCount = Math.max(...data.map((d) => d.value), 1);
  const chartLeft = 40;
  const chartBottom = height - 30;
  const chartTop = 18;
  const barWidth = 70;
  const gap = 45;

  ctx.fillStyle = "#334155";
  ctx.font = "12px Segoe UI";
  ctx.fillText("Count", 4, 14);

  data.forEach((item, index) => {
    const x = chartLeft + index * (barWidth + gap);
    const barHeight = ((chartBottom - chartTop) * item.value) / maxCount;
    const y = chartBottom - barHeight;

    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#111827";
    ctx.font = "12px Segoe UI";
    ctx.fillText(String(item.value), x + barWidth / 2 - 4, y - 6);
    ctx.fillText(item.label, x + 18, chartBottom + 16);
  });

  graphHintEl.textContent = `Low <= ${formatCurrency(lowCutoff)} | Medium <= ${formatCurrency(
    mediumCutoff
  )} | High > ${formatCurrency(mediumCutoff)}`;
};

const renderExpenses = () => {
  expenseList.innerHTML = "";

  if (!currentExpenses.length) {
    expenseList.innerHTML = '<li class="empty-item">No expenses yet. Add your first expense.</li>';
    updateSummary();
    drawExpenseLevelGraph();
    return;
  }

  currentExpenses.forEach((expense) => {
    const li = document.createElement("li");
    li.className = "expense-item";
    li.innerHTML = `
      <div class="expense-main">
        <strong>${expense.title}</strong>
        <span class="expense-category">${expense.category}</span>
      </div>
      <div class="expense-meta">
        <span>${new Date(expense.date).toLocaleDateString()}</span>
        <span class="expense-amount">${formatCurrency(expense.amount)}</span>
      </div>
      <p class="expense-note">${expense.note || "No note added."}</p>
      <button class="delete-btn" data-id="${expense._id}">Delete</button>
    `;
    expenseList.appendChild(li);
  });

  updateSummary();
  drawExpenseLevelGraph();
};

const loadExpenses = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseResponse(response);
    if (!response.ok) {
      showMessage(data.message || "Could not load expenses.");
      return;
    }

    currentExpenses = data.expenses || [];
    renderExpenses();
  } catch (error) {
    showMessage("Network error while loading expenses.");
  }
};

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const title = document.getElementById("title").value.trim();
  const amount = document.getElementById("amount").value;
  const category = document.getElementById("category").value.trim();
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value.trim();

  if (!title || !amount || !category || !date) {
    return showMessage("Please fill in all required expense fields.");
  }
  if (Number(amount) <= 0) {
    return showMessage("Amount must be greater than 0.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, amount, category, date, note }),
    });

    const data = await parseResponse(response);
    if (!response.ok) {
      return showMessage(data.message || "Could not add expense.");
    }

    showMessage("Expense added successfully.", "success");
    expenseForm.reset();
    loadExpenses();
  } catch (error) {
    showMessage("Network error while adding expense.");
  }
});

expenseList.addEventListener("click", async (event) => {
  const deleteBtn = event.target.closest(".delete-btn");
  if (!deleteBtn) {
    return;
  }

  const expenseId = deleteBtn.dataset.id;
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await parseResponse(response);

    if (!response.ok) {
      return showMessage(data.message || "Could not delete expense.");
    }

    showMessage("Expense deleted.", "success");
    loadExpenses();
  } catch (error) {
    showMessage("Network error while deleting expense.");
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./index.html";
});

loadUser();
loadExpenses();
