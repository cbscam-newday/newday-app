// app.js
// Simple Customers page with localStorage persistence

const STORAGE_KEY = "ndpc_customers_v1";

function loadCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomers(customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

let customers = loadCustomers();

// Seed demo data if empty
if (customers.length === 0) {
  customers = [
    { id: uid(), name: "John Smith", phone: "(201) 555-1234", address: "Fair Lawn, NJ", notes: "Ants in kitchen" },
    { id: uid(), name: "Maria Lopez", phone: "(973) 555-9876", address: "Paramus, NJ", notes: "Monthly service" },
  ];
  saveCustomers(customers);
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCustomersPage() {
  const rows = customers
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.address)}</td>
        <td>${escapeHtml(c.notes)}</td>
        <td style="text-align:right;">
          <button class="btn-danger" data-delete="${c.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <h2>Customers</h2>

    <div class="card">
      <h3 style="margin-top:0;">Add Customer</h3>
      <div class="form-grid">
        <div>
          <label>Name</label>
          <input id="c_name" placeholder="Customer name" />
        </div>
        <div>
          <label>Phone</label>
          <input id="c_phone" placeholder="(201) 555-5555" />
        </div>
        <div>
          <label>Address / Town</label>
          <input id="c_address" placeholder="Fair Lawn, NJ" />
        </div>
        <div>
          <label>Notes</label>
          <input id="c_notes" placeholder="Ants, mice, termites, etc." />
        </div>
      </div>

      <div style="margin-top:12px;">
        <button class="btn" id="add_customer_btn">Add Customer</button>
        <button class="btn-secondary" id="clear_customers_btn" title="Clears only customers on this device">Clear All</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">Customer List</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Address / Town</th>
            <th>Notes</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5">No customers yet.</td></tr>`}
        </tbody>
      </table>
      <p style="opacity:.7; margin:10px 0 0;">Saved on this device (localStorage). Next step will be a real database.</p>
    </div>
  `;
}

function attachCustomersHandlers() {
  const addBtn = document.getElementById("add_customer_btn");
  if (addBtn) {
    addBtn.onclick = () => {
      const name = document.getElementById("c_name")?.value?.trim() || "";
      const phone = document.getElementById("c_phone")?.value?.trim() || "";
      const address = document.getElementById("c_address")?.value?.trim() || "";
      const notes = document.getElementById("c_notes")?.value?.trim() || "";

      if (!name) {
        alert("Please enter a customer name.");
        return;
      }

      customers.unshift({ id: uid(), name, phone, address, notes });
      saveCustomers(customers);
      showPage("customers");
    };
  }

  const clearBtn = document.getElementById("clear_customers_btn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!confirm("Clear ALL customers saved on this device?")) return;
      customers = [];
      saveCustomers(customers);
      showPage("customers");
    };
  }

  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete");
      customers = customers.filter((c) => c.id !== id);
      saveCustomers(customers);
      showPage("customers");
    });
  });
}

// This is the function your buttons already call in index.html
window.showPage = function showPage(page) {
  const content = document.getElementById("content");
  if (!content) return;

   if (page === 'customers') {
  content.innerHTML = `
    <h2>Customers</h2>

    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <input id="customer-name" placeholder="Customer name" />
      <input id="customer-phone" placeholder="Phone number" />
      <button id="add-customer">Add</button>
    </div>

    <div id="customer-list"></div>
  `;

  const customers = [];

  function renderCustomers() {
    document.getElementById("customer-list").innerHTML =
      customers.map(c => `<div><strong>${c.name}</strong> — ${c.phone}</div>`).join("");
  }

  document.getElementById("add-customer").onclick = () => {
    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    if (!name || !phone) return alert("Enter name and phone");

    customers.push({ name, phone });
    renderCustomers();
  };

  return;
}


  // Simple placeholders for now
  const titles = {
    jobs: "Jobs",
    calendar: "Calendar",
    materials: "Materials",
    contracts: "Contracts",
    receipts: "Receipts",
  };

  content.innerHTML = `
    <h2>${titles[page] || "Page"}</h2>
    <p>This section will be built next.</p>
  `;
};
