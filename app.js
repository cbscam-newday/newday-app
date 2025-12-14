// New Day Pest Control App (Static / LocalStorage)
// Goal: PestPac-like workflow for Customers + Jobs + Chemicals + Receipt + Email via mailto

const TAX_RATE = 0.06625;

const DEFAULT_PESTS = [
  "Mice", "Rats", "Ants", "Spiders", "Roaches", "Bed Bugs",
  "Wasps", "Yellow Jackets", "Hornets", "Bees", "Termites",
  "Mosquitoes", "Fleas", "Ticks", "Crickets", "Moths"
];

const DEFAULT_CHEMICALS = [
  { id: uid(), name: "FirstStrike Soft Bait", epa: "" },
  { id: uid(), name: "CB-80", epa: "" },
  { id: uid(), name: "Transport Mikron", epa: "" },
];

const LS_KEYS = {
  customers: "nd_customers_v1",
  jobs: "nd_jobs_v1",
  chemicals: "nd_chemicals_v1",
  activeCustomerId: "nd_active_customer_v1",
  activeJobId: "nd_active_job_v1"
};

let state = {
  customers: load(LS_KEYS.customers, []),
  jobs: load(LS_KEYS.jobs, []),
  chemicals: load(LS_KEYS.chemicals, DEFAULT_CHEMICALS),
  activeCustomerId: localStorage.getItem(LS_KEYS.activeCustomerId) || null,
  activeJobId: localStorage.getItem(LS_KEYS.activeJobId) || null,
  jobChemRows: [], // working copy for editor
  selectedPests: new Set()
};

// ---------- Helpers ----------
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{ return fallback; }
}
function saveAll(){
  localStorage.setItem(LS_KEYS.customers, JSON.stringify(state.customers));
  localStorage.setItem(LS_KEYS.jobs, JSON.stringify(state.jobs));
  localStorage.setItem(LS_KEYS.chemicals, JSON.stringify(state.chemicals));
  localStorage.setItem(LS_KEYS.activeCustomerId, state.activeCustomerId || "");
  localStorage.setItem(LS_KEYS.activeJobId, state.activeJobId || "");
}
function money(n){
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}
function getCustomer(id){ return state.customers.find(c => c.id === id) || null; }
function getJob(id){ return state.jobs.find(j => j.id === id) || null; }
function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---------- Elements ----------
const pages = {
  customers: document.getElementById("page-customers"),
  jobs: document.getElementById("page-jobs"),
  calendar: document.getElementById("page-calendar"),
  materials: document.getElementById("page-materials"),
  receipts: document.getElementById("page-receipts"),
};

const navButtons = document.querySelectorAll(".nav-item");

const customerListEl = document.getElementById("customer-list");
const customerJobsEl = document.getElementById("customer-jobs");
const customerSearchEl = document.getElementById("customer-search");

const custName = document.getElementById("cust-name");
const custPhone = document.getElementById("cust-phone");
const custAddress = document.getElementById("cust-address");
const custEmail = document.getElementById("cust-email");
const custPlan = document.getElementById("cust-plan");

const btnNewCustomer = document.getElementById("btn-new-customer");
const btnSaveCustomer = document.getElementById("btn-save-customer");
const btnDeleteCustomer = document.getElementById("btn-delete-customer");
const btnCreateJob = document.getElementById("btn-create-job");

const jobListEl = document.getElementById("job-list");
const jobSearchEl = document.getElementById("job-search");
const btnNewJob = document.getElementById("btn-new-job");

const jobCustomer = document.getElementById("job-customer");
const jobFrequency = document.getElementById("job-frequency");
const jobDate = document.getElementById("job-date");
const pestChips = document.getElementById("pest-chips");
const jobNotes = document.getElementById("job-notes");
const jobAmount = document.getElementById("job-amount");
const taxPreview = document.getElementById("tax-preview");
const totalPreview = document.getElementById("total-preview");

const btnAddChemicalRow = document.getElementById("btn-add-chemical-row");
const chemTbody = document.getElementById("chem-tbody");

const btnSaveJob = document.getElementById("btn-save-job");
const btnDeleteJob = document.getElementById("btn-delete-job");
const btnViewReceipt = document.getElementById("btn-view-receipt");
const btnEmailReceipt = document.getElementById("btn-email-receipt");

const btnManageChemicals = document.getElementById("btn-manage-chemicals");
const chemModal = document.getElementById("chem-modal");
const chemModalClose = document.getElementById("chem-modal-close");
const chemDone = document.getElementById("chem-done");
const chemList = document.getElementById("chem-list");
const chemNewName = document.getElementById("chem-new-name");
const chemNewEpa = document.getElementById("chem-new-epa");
const chemAdd = document.getElementById("chem-add");

const receiptModal = document.getElementById("receipt-modal");
const receiptClose = document.getElementById("receipt-close");
const receiptClose2 = document.getElementById("receipt-close-2");
const receiptPaper = document.getElementById("receipt-paper");
const receiptSubtitle = document.getElementById("receipt-subtitle");
const receiptCopy = document.getElementById("receipt-copy");

const btnExport = document.getElementById("btn-export");
const btnImport = document.getElementById("btn-import");
const importFile = document.getElementById("import-file");

// ---------- Navigation ----------
function showPage(name){
  Object.entries(pages).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
  navButtons.forEach(b => b.classList.toggle("active", b.dataset.page === name));
}
navButtons.forEach(b => b.addEventListener("click", () => {
  showPage(b.dataset.page);
  if (b.dataset.page === "customers") renderCustomers();
  if (b.dataset.page === "jobs") renderJobs();
}));

// ---------- Customers ----------
btnNewCustomer.addEventListener("click", () => {
  const c = {
    id: uid(),
    name: "",
    phone: "",
    address: "",
    email: "",
    plan: "One-Time",
    createdAt: Date.now()
  };
  state.customers.unshift(c);
  state.activeCustomerId = c.id;
  saveAll();
  renderCustomers();
  focusCustomerForm();
});

btnSaveCustomer.addEventListener("click", () => {
  const c = getCustomer(state.activeCustomerId);
  if (!c) return alert("Select a customer first.");

  c.name = custName.value.trim();
  c.phone = custPhone.value.trim();
  c.address = custAddress.value.trim();
  c.email = custEmail.value.trim();
  c.plan = custPlan.value;

  if (!c.name) return alert("Customer name is required.");
  saveAll();
  renderCustomers();
});

btnDeleteCustomer.addEventListener("click", () => {
  const c = getCustomer(state.activeCustomerId);
  if (!c) return alert("Select a customer first.");
  if (!confirm(`Delete customer "${c.name || "Untitled"}"?`)) return;

  // delete customer + their jobs
  state.jobs = state.jobs.filter(j => j.customerId !== c.id);
  state.customers = state.customers.filter(x => x.id !== c.id);
  state.activeCustomerId = state.customers[0]?.id || null;
  state.activeJobId = null;
  saveAll();
  renderCustomers();
});

btnCreateJob.addEventListener("click", () => {
  const c = getCustomer(state.activeCustomerId);
  if (!c) return alert("Select a customer first.");
  createJobForCustomer(c.id);
  showPage("jobs");
  renderJobs();
});

customerSearchEl.addEventListener("input", renderCustomers);

function focusCustomerForm(){
  setTimeout(() => custName.focus(), 50);
}

function renderCustomers(){
  const q = (customerSearchEl.value || "").toLowerCase().trim();

  const filtered = state.customers.filter(c => {
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  customerListEl.innerHTML = "";
  filtered.forEach(c => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <div class="list-title">${escapeHTML(c.name || "Untitled Customer")}</div>
        <div class="list-sub">${escapeHTML(c.phone || "")} ${c.email ? "• " + escapeHTML(c.email) : ""}</div>
      </div>
      <span class="pill">${escapeHTML(c.plan || "One-Time")}</span>
    `;
    item.addEventListener("click", () => {
      state.activeCustomerId = c.id;
      saveAll();
      renderCustomers();
    });
    customerListEl.appendChild(item);
  });

  const active = getCustomer(state.activeCustomerId) || filtered[0] || null;
  if (!active && state.customers[0]) {
    state.activeCustomerId = state.customers[0].id;
  }
  const active2 = getCustomer(state.activeCustomerId);

  if (active2) {
    custName.value = active2.name || "";
    custPhone.value = active2.phone || "";
    custAddress.value = active2.address || "";
    custEmail.value = active2.email || "";
    custPlan.value = active2.plan || "One-Time";
  } else {
    custName.value = custPhone.value = custAddress.value = custEmail.value = "";
    custPlan.value = "One-Time";
  }

  renderCustomerJobs();
  renderJobCustomerDropdown();
}

function renderCustomerJobs(){
  const c = getCustomer(state.activeCustomerId);
  if (!c){
    customerJobsEl.innerHTML = `<div class="list-item"><div class="muted">No customer selected.</div></div>`;
    return;
  }
  const jobs = state.jobs
    .filter(j => j.customerId === c.id)
    .sort((a,b) => (b.date || "").localeCompare(a.date || ""));

  customerJobsEl.innerHTML = "";
  if (jobs.length === 0){
    customerJobsEl.innerHTML = `<div class="list-item"><div class="muted">No jobs yet.</div></div>`;
    return;
  }

  jobs.forEach(j => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <div class="list-title">${escapeHTML(j.date || "")} • ${escapeHTML((j.pests||[]).join(", ") || "Service")}</div>
        <div class="list-sub">${escapeHTML(j.frequency || "")} • ${money(j.amount || 0)}</div>
      </div>
      <span class="pill">Open</span>
    `;
    item.addEventListener("click", () => {
      state.activeJobId = j.id;
      saveAll();
      showPage("jobs");
      renderJobs();
    });
    customerJobsEl.appendChild(item);
  });
}

// ---------- Jobs ----------
btnNewJob.addEventListener("click", () => {
  createJobForCustomer(state.activeCustomerId || state.customers[0]?.id || null);
  renderJobs();
});

jobSearchEl.addEventListener("input", renderJobs);

function createJobForCustomer(customerId){
  if (!customerId){
    alert("Create/select a customer first.");
    showPage("customers");
    return;
  }
  const c = getCustomer(customerId);
  const j = {
    id: uid(),
    customerId,
    frequency: c?.plan || "One-Time",
    date: todayISO(),
    pests: [],
    notes: "",
    amount: 0,
    chemicalsUsed: [] // { chemicalId, amount, unit, ratio }
  };
  state.jobs.unshift(j);
  state.activeJobId = j.id;
  saveAll();
}

function renderJobs(){
  renderJobCustomerDropdown();

  // list
  const q = (jobSearchEl.value || "").toLowerCase().trim();
  const filtered = state.jobs.filter(j => {
    const c = getCustomer(j.customerId);
    const text = [
      c?.name, c?.phone, j.date, j.frequency, (j.pests||[]).join(", ")
    ].join(" ").toLowerCase();
    return !q || text.includes(q);
  });

  jobListEl.innerHTML = "";
  filtered.forEach(j => {
    const c = getCustomer(j.customerId);
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <div class="list-title">${escapeHTML(j.date || "")} • ${escapeHTML(c?.name || "Unknown")}</div>
        <div class="list-sub">${escapeHTML((j.pests||[]).join(", ") || "Service")} • ${money(j.amount || 0)}</div>
      </div>
      <span class="pill">${escapeHTML(j.frequency || "")}</span>
    `;
    item.addEventListener("click", () => {
      state.activeJobId = j.id;
      saveAll();
      fillJobEditor(j.id);
    });
    jobListEl.appendChild(item);
  });

  // editor
  const active = getJob(state.activeJobId) || filtered[0] || null;
  if (!active && state.jobs[0]){
    state.activeJobId = state.jobs[0].id;
  }
  if (state.activeJobId) fillJobEditor(state.activeJobId);
}

function renderJobCustomerDropdown(){
  const prev = jobCustomer.value;
  jobCustomer.innerHTML = "";
  state.customers.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name ? c.name : "Untitled Customer";
    jobCustomer.appendChild(opt);
  });

  // keep selection if possible
  if (prev && state.customers.some(c => c.id === prev)) jobCustomer.value = prev;
}

function fillJobEditor(jobId){
  const j = getJob(jobId);
  if (!j) return;

  state.selectedPests = new Set(j.pests || []);
  jobCustomer.value = j.customerId;
  jobFrequency.value = j.frequency || "One-Time";
  jobDate.value = j.date || todayISO();
  jobNotes.value = j.notes || "";
  jobAmount.value = Number(j.amount || 0);

  renderPestChips();
  // working copy of chemicals rows
  state.jobChemRows = (j.chemicalsUsed || []).map(x => ({...x}));
  renderChemTable();
  updateTotals();
}

function renderPestChips(){
  pestChips.innerHTML = "";
  DEFAULT_PESTS.forEach(p => {
    const chip = document.createElement("div");
    chip.className = "chip" + (state.selectedPests.has(p) ? " active" : "");
    chip.textContent = p;
    chip.addEventListener("click", () => {
      if (state.selectedPests.has(p)) state.selectedPests.delete(p);
      else state.selectedPests.add(p);
      renderPestChips();
    });
    pestChips.appendChild(chip);
  });
}

jobAmount.addEventListener("input", updateTotals);

function updateTotals(){
  const amt = Number(jobAmount.value || 0);
  const tax = amt * TAX_RATE;
  const total = amt + tax;
  taxPreview.textContent = money(tax);
  totalPreview.textContent = money(total);
}

// ---------- Chemicals Table ----------
btnAddChemicalRow.addEventListener("click", () => {
  state.jobChemRows.push({
    id: uid(),
    chemicalId: state.chemicals[0]?.id || "",
    amount: "",
    unit: "oz",
    ratio: ""
  });
  renderChemTable();
});

function renderChemTable(){
  chemTbody.innerHTML = "";

  if (state.jobChemRows.length === 0){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="muted">No chemicals added yet. Click “+ Add Chemical”.</td>`;
    chemTbody.appendChild(tr);
    return;
  }

  state.jobChemRows.forEach((row, idx) => {
    const tr = document.createElement("tr");

    // chemical dropdown
    const tdChem = document.createElement("td");
    const sel = document.createElement("select");
    sel.className = "small-input";
    state.chemicals.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = ch.epa ? `${ch.name} (EPA ${ch.epa})` : ch.name;
      sel.appendChild(opt);
    });
    sel.value = row.chemicalId || (state.chemicals[0]?.id || "");
    sel.addEventListener("change", () => {
      row.chemicalId = sel.value;
      saveAll(); // safe
    });
    tdChem.appendChild(sel);

    // amount
    const tdAmt = document.createElement("td");
    const inpAmt = document.createElement("input");
    inpAmt.className = "small-input";
    inpAmt.type = "number";
    inpAmt.step = "0.01";
    inpAmt.placeholder = "0";
    inpAmt.value = row.amount ?? "";
    inpAmt.addEventListener("input", () => row.amount = inpAmt.value);
    tdAmt.appendChild(inpAmt);

    // unit
    const tdUnit = document.createElement("td");
    const unitSel = document.createElement("select");
    unitSel.className = "small-input";
    ["oz","ml","gal"].forEach(u => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      unitSel.appendChild(opt);
    });
    unitSel.value = row.unit || "oz";
    unitSel.addEventListener("change", () => row.unit = unitSel.value);
    tdUnit.appendChild(unitSel);

    // ratio
    const tdRatio = document.createElement("td");
    const inpRatio = document.createElement("input");
    inpRatio.className = "small-input";
    inpRatio.placeholder = "ex: 1 oz / 1 gal";
    inpRatio.value = row.ratio ?? "";
    inpRatio.addEventListener("input", () => row.ratio = inpRatio.value);
    tdRatio.appendChild(inpRatio);

    // remove
    const tdRm = document.createElement("td");
    const rm = document.createElement("button");
    rm.className = "icon-btn";
    rm.textContent = "🗑";
    rm.title = "Remove";
    rm.addEventListener("click", () => {
      state.jobChemRows.splice(idx, 1);
      renderChemTable();
    });
    tdRm.appendChild(rm);

    tr.appendChild(tdChem);
    tr.appendChild(tdAmt);
    tr.appendChild(tdUnit);
    tr.appendChild(tdRatio);
    tr.appendChild(tdRm);

    chemTbody.appendChild(tr);
  });
}

// ---------- Save/Delete Job ----------
btnSaveJob.addEventListener("click", () => {
  const j = getJob(state.activeJobId);
  if (!j) return alert("Select a job first.");

  const customerId = jobCustomer.value;
  if (!customerId) return alert("Select a customer.");
  j.customerId = customerId;
  j.frequency = jobFrequency.value;
  j.date = jobDate.value || todayISO();
  j.pests = Array.from(state.selectedPests);
  j.notes = jobNotes.value || "";
  j.amount = Number(jobAmount.value || 0);

  // save chemicals (remove empty rows)
  j.chemicalsUsed = state.jobChemRows
    .filter(r => r.chemicalId)
    .map(r => ({
      id: r.id || uid(),
      chemicalId: r.chemicalId,
      amount: r.amount || "",
      unit: r.unit || "oz",
      ratio: r.ratio || ""
    }));

  saveAll();
  renderJobs();
  alert("Saved.");
});

btnDeleteJob.addEventListener("click", () => {
  const j = getJob(state.activeJobId);
  if (!j) return alert("Select a job first.");
  if (!confirm("Delete this job?")) return;

  state.jobs = state.jobs.filter(x => x.id !== j.id);
  state.activeJobId = state.jobs[0]?.id || null;
  saveAll();
  renderJobs();
});

jobCustomer.addEventListener("change", () => {
  // nothing special, but update receipt preview later
});

// ---------- Receipt ----------
btnViewReceipt.addEventListener("click", () => {
  const j = getJob(state.activeJobId);
  if (!j) return alert("Select a job first.");
  openReceiptModal(j);
});

btnEmailReceipt.addEventListener("click", () => {
  const j = getJob(state.activeJobId);
  if (!j) return alert("Select a job first.");
  const c = getCustomer(j.customerId);
  if (!c?.email) return alert("This customer has no email. Add it in Customers first.");

  const { subject, body } = buildReceiptEmail(j);
  const mailto = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
});

function openReceiptModal(j){
  const c = getCustomer(j.customerId);
  receiptSubtitle.textContent = `${c?.name || "Customer"} • ${j.date || ""}`;
  receiptPaper.textContent = buildReceiptText(j);
  receiptModal.classList.remove("hidden");
}

function buildReceiptText(j){
  const c = getCustomer(j.customerId);
  const amt = Number(j.amount || 0);
  const tax = amt * TAX_RATE;
  const total = amt + tax;

  const lines = [];
  lines.push("NEW DAY PEST CONTROL");
  lines.push("(201) 972-5592 • newdaypestcontrol@yahoo.com");
  lines.push("");
  lines.push(`Customer: ${c?.name || ""}`);
  lines.push(`Phone: ${c?.phone || ""}`);
  lines.push(`Email: ${c?.email || ""}`);
  lines.push(`Address: ${c?.address || ""}`);
  lines.push("");
  lines.push(`Date: ${j.date || ""}`);
  lines.push(`Service Frequency: ${j.frequency || ""}`);
  lines.push(`Service Type: ${(j.pests || []).join(", ") || ""}`);
  lines.push("");
  lines.push("Chemicals Used:");
  if (!j.chemicalsUsed || j.chemicalsUsed.length === 0){
    lines.push("  (none)");
  } else {
    j.chemicalsUsed.forEach(r => {
      const ch = state.chemicals.find(x => x.id === r.chemicalId);
      const name = ch ? ch.name : "Unknown";
      const epa = ch?.epa ? ` (EPA ${ch.epa})` : "";
      const amtUsed = r.amount ? `${r.amount} ${r.unit || ""}` : "";
      const ratio = r.ratio ? ` | Ratio: ${r.ratio}` : "";
      lines.push(`  - ${name}${epa} | ${amtUsed}${ratio}`);
    });
  }
  lines.push("");
  lines.push("Notes:");
  lines.push(j.notes ? `  ${j.notes}` : "  (none)");
  lines.push("");
  lines.push(`Subtotal: ${money(amt)}`);
  lines.push(`NJ Tax (6.625%): ${money(tax)}`);
  lines.push(`TOTAL: ${money(total)}`);
  lines.push("");
  lines.push("Thank you for your business!");
  return lines.join("\n");
}

function buildReceiptEmail(j){
  const c = getCustomer(j.customerId);
  const subject = `New Day Pest Control Receipt - ${c?.name || "Customer"} - ${j.date || ""}`;
  const body = buildReceiptText(j);
  return { subject, body };
}

receiptClose.addEventListener("click", () => receiptModal.classList.add("hidden"));
receiptClose2.addEventListener("click", () => receiptModal.classList.add("hidden"));
receiptCopy.addEventListener("click", async () => {
  try{
    await navigator.clipboard.writeText(receiptPaper.textContent);
    alert("Copied!");
  }catch{
    alert("Copy failed (browser permission). You can manually select and copy.");
  }
});

// ---------- Manage Chemicals ----------
btnManageChemicals.addEventListener("click", () => {
  renderChemManager();
  chemModal.classList.remove("hidden");
});
chemModalClose.addEventListener("click", () => chemModal.classList.add("hidden"));
chemDone.addEventListener("click", () => chemModal.classList.add("hidden"));

chemAdd.addEventListener("click", () => {
  const name = chemNewName.value.trim();
  const epa = chemNewEpa.value.trim();
  if (!name) return alert("Chemical name required.");

  state.chemicals.push({ id: uid(), name, epa });
  chemNewName.value = "";
  chemNewEpa.value = "";
  saveAll();
  renderChemManager();
  renderChemTable(); // refresh dropdowns
});

function renderChemManager(){
  chemList.innerHTML = "";
  if (state.chemicals.length === 0){
    chemList.innerHTML = `<div class="list-item"><div class="muted">No chemicals yet.</div></div>`;
    return;
  }

  state.chemicals.forEach(ch => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div style="flex:1;">
        <div class="list-title">${escapeHTML(ch.name)}</div>
        <div class="list-sub">${ch.epa ? `EPA ${escapeHTML(ch.epa)}` : "No EPA # saved"}</div>
      </div>
      <div class="row gap">
        <button class="btn btn-outline" data-act="edit">Edit</button>
        <button class="btn btn-danger" data-act="del">Delete</button>
      </div>
    `;

    item.querySelector('[data-act="edit"]').addEventListener("click", () => {
      const newName = prompt("Chemical name:", ch.name);
      if (newName === null) return;
      const newEpa = prompt("EPA # (optional):", ch.epa || "");
      if (newEpa === null) return;

      ch.name = newName.trim() || ch.name;
      ch.epa = (newEpa || "").trim();
      saveAll();
      renderChemManager();
      renderChemTable();
    });

    item.querySelector('[data-act="del"]').addEventListener("click", () => {
      if (!confirm(`Delete "${ch.name}"?`)) return;

      // Remove from chemicals list
      state.chemicals = state.chemicals.filter(x => x.id !== ch.id);

      // Remove from any job rows that referenced it
      state.jobs.forEach(j => {
        j.chemicalsUsed = (j.chemicalsUsed || []).filter(r => r.chemicalId !== ch.id);
      });

      // Also remove from current working editor rows
      state.jobChemRows = state.jobChemRows.filter(r => r.chemicalId !== ch.id);

      saveAll();
      renderChemManager();
      renderChemTable();
    });

    chemList.appendChild(item);
  });
}

// ---------- Import / Export ----------
btnExport.addEventListener("click", () => {
  const payload = {
    customers: state.customers,
    jobs: state.jobs,
    chemicals: state.chemicals,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "newday-app-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

btnImport.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;

  try{
    const text = await file.text();
    const payload = JSON.parse(text);

    if (!payload || !Array.isArray(payload.customers) || !Array.isArray(payload.jobs) || !Array.isArray(payload.chemicals)){
      return alert("Invalid backup file.");
    }

    if (!confirm("This will REPLACE your current data on this device. Continue?")) return;

    state.customers = payload.customers;
    state.jobs = payload.jobs;
    state.chemicals = payload.chemicals;

    state.activeCustomerId = state.customers[0]?.id || null;
    state.activeJobId = state.jobs[0]?.id || null;

    saveAll();
    renderCustomers();
    renderJobs();
    alert("Imported!");
  }catch(e){
    alert("Import failed. Make sure it’s a valid JSON backup file.");
  }finally{
    importFile.value = "";
  }
});

// ---------- Utility ----------
function escapeHTML(str){
  return String(str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---------- Init ----------
function init(){
  if (state.customers.length === 0){
    // create a starter customer so app doesn't look empty
    const starter = {
      id: uid(),
      name: "Sample Customer",
      phone: "",
      address: "",
      email: "",
      plan: "One-Time",
      createdAt: Date.now()
    };
    state.customers.push(starter);
    state.activeCustomerId = starter.id;
  }

  if (state.jobs.length === 0 && state.activeCustomerId){
    createJobForCustomer(state.activeCustomerId);
  }

  if (!state.activeCustomerId) state.activeCustomerId = state.customers[0]?.id || null;
  if (!state.activeJobId) state.activeJobId = state.jobs[0]?.id || null;

  // set default date
  jobDate.value = todayISO();

  saveAll();
  showPage("customers");
  renderCustomers();
  renderJobs();
  updateTotals();
}

init();
