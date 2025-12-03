// Simple page switcher
function showPage(page) {
  const content = document.getElementById("content");

  if (page === "customers") {
    content.innerHTML = `
      <h2>Customers</h2>
      <p>Customer list will appear here.</p>
      <button onclick="addCustomer()">Add Customer</button>
    `;
  }

  if (page === "jobs") {
    content.innerHTML = `
      <h2>Jobs</h2>
      <p>Multi-chemical job form will appear here.</p>
    `;
  }

  if (page === "calendar") {
    content.innerHTML = `
      <h2>Calendar</h2>
      <p>The job calendar will appear here.</p>
    `;
  }

  if (page === "materials") {
    content.innerHTML = `
      <h2>Materials</h2>
      <p>Chemical list with EPA numbers will appear here.</p>
    `;
  }

  if (page === "contracts") {
    content.innerHTML = `
      <h2>Contracts</h2>
      <p>One-time, Monthly, Quarterly, Yearly service agreements.</p>
    `;
  }

  if (page === "receipts") {
    content.innerHTML = `
      <h2>Receipts</h2>
      <p>Receipt generator with tax + signature will appear here.</p>
    `;
  }
}

// Placeholder function
function addCustomer() {
  alert("Customer creation screen coming soon.");
}
