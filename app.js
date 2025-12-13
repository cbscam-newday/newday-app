// Simple page router
window.showPage = function (page) {
  const content = document.getElementById("content");
  if (!content) return;

  if (page === "customers") {
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
        customers.map(c =>
          `<div><strong>${c.name}</strong> — ${c.phone}</div>`
        ).join("");
    }

    document.getElementById("add-customer").onclick = () => {
      const name = document.getElementById("customer-name").value.trim();
      const phone = document.getElementById("customer-phone").value.trim();

      if (!name || !phone) {
        alert("Enter name and phone");
        return;
      }

      customers.push({ name, phone });
      renderCustomers();

      document.getElementById("customer-name").value = "";
      document.getElementById("customer-phone").value = "";
    };

    return;
  }

  // Default placeholder pages
  content.innerHTML = `<h2>${page}</h2><p>Coming soon.</p>`;
};
