/* New Day Pest Control - simple PestPac-style demo (no backend)
   - Customers saved in localStorage
   - Calendar week view with 30-min slots
   - Schedule job: customer autofill (phone/address/email), map link
*/

(function () {
  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const LS_KEYS = {
    customers: "ndpc_customers_v1",
    jobs: "ndpc_jobs_v1",
  };

  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const parseDate = (yyyyMmDd) => {
    // yyyy-mm-dd -> local date (avoid timezone shifts)
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const fmtDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const startOfWeekMon = (d) => {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1 - day); // to Monday
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const timeLabel = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const mapsLink = (address) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

  // ---------- state ----------
  let customers = load(LS_KEYS.customers, []);
  let jobs = load(LS_KEYS.jobs, []);

  function persist() {
    save(LS_KEYS.customers, customers);
    save(LS_KEYS.jobs, jobs);
  }

  // ---------- shared layout styles (injected) ----------
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --green:#0b7a2a;
      --green-2:#e9f6ee;
      --border:#e6e6e6;
      --text:#111;
      --muted:#6b7280;
      --bg:#f6f8fb;
    }

    .nd-wrap{ padding:18px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--text); }
    .nd-shell{ display:grid; grid-template-columns: 260px 1fr 320px; gap:18px; align-items:start; }
    .nd-card{ background:#fff; border:1px solid var(--border); border-radius:16px; padding:14px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
    .nd-menu h4{ margin:0 0 10px 0; font-size:13px; letter-spacing:.08em; color:var(--green); }
    .nd-menu a{ display:block; padding:10px 12px; border-radius:12px; color:#111; text-decoration:none; font-weight:600; }
    .nd-menu a.active{ background:var(--green-2); border-left:4px solid var(--green); padding-left:8px; }
    .nd-pill{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:var(--green-2); border:1px solid #cfead8; font-weight:700; color:var(--green); }
    .nd-h1{ font-size:22px; margin:0; }
    .nd-sub{ color:var(--muted); margin:6px 0 0; font-weight:600; }
    .nd-topbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .nd-actions{ display:flex; gap:10px; }
    .nd-btn{ cursor:pointer; border-radius:12px; padding:10px 14px; border:1px solid var(--border); background:#fff; font-weight:800; }
    .nd-btn.primary{ background:var(--green); color:#fff; border-color:var(--green); }
    .nd-grid{ display:grid; gap:12px; }
    .nd-row{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    .nd-row3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
    .nd-field label{ display:block; font-size:12px; font-weight:900; color:#111; margin:0 0 6px; }
    .nd-field input, .nd-field select, .nd-field textarea{
      width:100%; padding:12px 12px; border-radius:12px; border:1px solid var(--border); outline:none;
      font-weight:650; background:#fff;
    }
    .nd-field textarea{ min-height:90px; resize:vertical; }
    .nd-help{ font-size:12px; color:var(--muted); margin-top:6px; font-weight:650; }
    .nd-divider{ height:1px; background:var(--border); margin:12px 0; }
    .nd-right h3{ margin:0 0 8px; }
    .nd-table{ width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border:1px solid var(--border); border-radius:12px; }
    .nd-table th{ text-align:left; font-size:12px; padding:10px 10px; background:var(--green-2); color:var(--green); }
    .nd-table td{ padding:10px 10px; border-top:1px solid var(--border); font-weight:650; }
    .nd-empty{ color:var(--muted); font-weight:700; padding:10px; }
    .nd-link{ color:var(--green); font-weight:900; text-decoration:none; }
    .nd-link:hover{ text-decoration:underline; }

    /* Calendar grid */
    .cal-wrap{ overflow:auto; border:1px solid var(--border); border-radius:14px; }
    .cal-grid{ display:grid; grid-template-columns: 86px repeat(7, minmax(150px, 1fr)); min-width: 1100px; }
    .cal-head{ position:sticky; top:0; z-index:2; background:#fff; border-bottom:1px solid var(--border); }
    .cal-hcell{ padding:10px; border-right:1px solid var(--border); }
    .cal-hday{ font-weight:950; }
    .cal-hdate{ margin-top:2px; font-weight:950; color:#111; } /* BOLD DATE */
    .cal-time{ padding:10px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); color:var(--muted); font-weight:800; background:#fff; }
    .cal-cell{ padding:8px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); background:#fff; cursor:pointer; }
    .cal-cell:hover{ background:var(--green-2); }
    .cal-job{ display:block; padding:8px; border-radius:12px; border:1px solid #cfead8; background:var(--green-2); }
    .cal-job .t{ font-weight:950; color:#0b4f1b; }
    .cal-job .m{ font-weight:750; color:#145a23; margin-top:2px; font-size:12px; }
    .cal-toolbar{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; }
    .cal-toolbar .left{ display:flex; align-items:center; gap:10px; }
    .cal-toolbar .range{ font-weight:950; }
  `;
  document.head.appendChild(style);

  // ---------- pages ----------
  function renderShell(active) {
    const content = $("#content");
    if (!content) {
      alert('Missing <main id="content"> in index.html');
      return;
    }

    content.innerHTML = `
      <div class="nd-wrap">
        <div class="nd-topbar">
          <div class="nd-pill">NJ Tax: 6.625%</div>
          <div class="nd-pill">${active === "calendar" ? "Calendar" : active === "customers" ? "Customers / Service Ticket" : "New Day App"}</div>
        </div>

        <div class="nd-shell">
          <div class="nd-card nd-menu">
            <h4>MENU</h4>
            <a href="#" data-nav="customers" class="${active === "customers" ? "active" : ""}">Customers</a>
            <a href="#" data-nav="jobs" class="${active === "jobs" ? "active" : ""}">Jobs</a>
            <a href="#" data-nav="calendar" class="${active === "calendar" ? "active" : ""}">Calendar</a>
            <a href="#" data-nav="materials" class="${active === "materials" ? "active" : ""}">Materials</a>
            <a href="#" data-nav="contracts" class="${active === "contracts" ? "active" : ""}">Contracts</a>
            <a href="#" data-nav="receipts" class="${active === "receipts" ? "active" : ""}">Receipts</a>

            <div class="nd-divider"></div>
            <div style="font-weight:900;">Status</div>
            <div class="nd-help">Local save: <b>ON</b> (browser)</div>
          </div>

          <div class="nd-card" id="mainPanel"></div>

          <div class="nd-card nd-right" id="rightPanel"></div>
        </div>
      </div>
    `;

    // nav wiring
    content.querySelectorAll("[data-nav]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const page = a.getAttribute("data-nav");
        window.showPage(page);
      });
    });
  }

  function renderCustomers() {
    renderShell("customers");
    const main = $("#mainPanel");
    const right = $("#rightPanel");

    main.innerHTML = `
      <div class="nd-topbar">
        <div>
          <h2 class="nd-h1">Service Ticket</h2>
          <div class="nd-sub">Customer + job details, address, phone, totals, and quick receipt.</div>
        </div>
        <div class="nd-actions">
          <button class="nd-btn primary" id="saveTicket">Save</button>
          <button class="nd-btn" id="clearTicket">Clear</button>
        </div>
      </div>

      <div class="nd-grid">
        <div class="nd-row3">
          <div class="nd-field">
            <label>Date</label>
            <input id="tDate" type="date" value="${fmtDate(new Date())}"/>
          </div>
          <div class="nd-field">
            <label>Service Frequency</label>
            <select id="tFrequency">
              <option>One-time</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Bi-monthly</option>
              <option>Weekly</option>
            </select>
          </div>
          <div class="nd-field">
            <label>Charge (subtotal)</label>
            <input id="tCharge" type="number" step="0.01" placeholder="e.g. 149.00"/>
            <div class="nd-help" id="tTotals"></div>
          </div>
        </div>

        <div class="nd-row">
          <div class="nd-field">
            <label>Customer (autofill)</label>
            <select id="tCustomerSelect">
              <option value="">Select saved customer…</option>
              ${customers
                .slice()
                .sort((a,b)=> (a.name||"").localeCompare(b.name||""))
                .map((c) => `<option value="${esc(c.id)}">${esc(c.name || "(no name)")} — ${esc(c.phone || "")}</option>`)
                .join("")}
            </select>
            <div class="nd-help">Pick a customer and we’ll auto-fill name, phone, email, address.</div>
          </div>
          <div class="nd-field">
            <label>Phone</label>
            <input id="tPhone" placeholder="(###) ###-####"/>
          </div>
        </div>

        <div class="nd-row">
          <div class="nd-field">
            <label>Customer Name</label>
            <input id="tName" placeholder="Customer full name"/>
          </div>
          <div class="nd-field">
            <label>Email</label>
            <input id="tEmail" placeholder="customer@email.com"/>
          </div>
        </div>

        <div class="nd-field">
          <label>Address</label>
          <input id="tAddress" placeholder="Street, City, NJ ZIP"/>
          <div class="nd-help">
            <a class="nd-link" id="mapLink" href="#" target="_blank" rel="noreferrer">Open in Google Maps</a>
          </div>
        </div>

        <div class="nd-field">
          <label>Notes</label>
          <textarea id="tNotes" placeholder="Notes for this job…"></textarea>
        </div>

        <div class="nd-divider"></div>

        <div class="nd-topbar" style="margin:0;">
          <div>
            <h3 style="margin:0;">Quick Add / Update Customer</h3>
            <div class="nd-sub">Save customer to your local database so calendar/job autofill works.</div>
          </div>
          <button class="nd-btn" id="saveCustomer">Save Customer</button>
        </div>

        <div class="nd-row">
          <div class="nd-field">
            <label>Customer Name</label>
            <input id="cName" placeholder="Customer name"/>
          </div>
          <div class="nd-field">
            <label>Phone</label>
            <input id="cPhone" placeholder="Phone number"/>
          </div>
        </div>

        <div class="nd-row">
          <div class="nd-field">
            <label>Email</label>
            <input id="cEmail" placeholder="Email"/>
          </div>
          <div class="nd-field">
            <label>Address</label>
            <input id="cAddress" placeholder="Street, City, NJ ZIP"/>
          </div>
        </div>

      </div>
    `;

    right.innerHTML = `
      <h3>Saved Customers</h3>
      <div class="nd-help">Click a row to load it into the ticket/customer form.</div>
      <div class="nd-divider"></div>
      ${
        customers.length === 0
          ? `<div class="nd-empty">No customers saved yet.</div>`
          : `
            <table class="nd-table">
              <thead>
                <tr><th>Name</th><th>Phone</th></tr>
              </thead>
              <tbody>
                ${customers
                  .slice()
                  .sort((a,b)=> (a.name||"").localeCompare(b.name||""))
                  .map(
                    (c) => `
                      <tr data-cid="${esc(c.id)}" style="cursor:pointer;">
                        <td>${esc(c.name)}</td>
                        <td>${esc(c.phone || "")}</td>
                      </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          `
      }
      <div class="nd-divider"></div>
      <button class="nd-btn" id="emailReceipt">Email Receipt (mailto)</button>
      <div class="nd-help">
        Real email sending needs a backend later. This opens your email app with the receipt text.
      </div>
    `;

    // totals calc
    const updateTotals = () => {
      const subtotal = Number($("#tCharge").value || 0);
      const taxRate = 0.06625;
      const tax = +(subtotal * taxRate).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      $("#tTotals").textContent = `Tax: $${tax.toFixed(2)} | Total: $${total.toFixed(2)}`;
    };
    $("#tCharge").addEventListener("input", updateTotals);
    updateTotals();

    // map link
    const updateMapLink = () => {
      const addr = $("#tAddress").value.trim();
      $("#mapLink").href = mapsLink(addr);
    };
    $("#tAddress").addEventListener("input", updateMapLink);
    updateMapLink();

    // autofill from saved customer
    $("#tCustomerSelect").addEventListener("change", () => {
      const id = $("#tCustomerSelect").value;
      const c = customers.find((x) => x.id === id);
      if (!c) return;
      $("#tName").value = c.name || "";
      $("#tPhone").value = c.phone || "";
      $("#tEmail").value = c.email || "";
      $("#tAddress").value = c.address || "";
      updateMapLink();
      // also load into quick-save section
      $("#cName").value = c.name || "";
      $("#cPhone").value = c.phone || "";
      $("#cEmail").value = c.email || "";
      $("#cAddress").value = c.address || "";
    });

    // click saved customer row
    right.querySelectorAll("tr[data-cid]").forEach((tr) => {
      tr.addEventListener("click", () => {
        const id = tr.getAttribute("data-cid");
        $("#tCustomerSelect").value = id;
        $("#tCustomerSelect").dispatchEvent(new Event("change"));
      });
    });

    // save customer (upsert by name+phone if matches)
    $("#saveCustomer").addEventListener("click", () => {
      const name = $("#cName").value.trim();
      const phone = $("#cPhone").value.trim();
      const email = $("#cEmail").value.trim();
      const address = $("#cAddress").value.trim();

      if (!name) return alert("Customer name is required.");

      let existing =
        customers.find((c) => (c.name || "").toLowerCase() === name.toLowerCase() && (c.phone || "") === phone) ||
        customers.find((c) => (c.name || "").toLowerCase() === name.toLowerCase());

      if (existing) {
        existing.phone = phone || existing.phone;
        existing.email = email || existing.email;
        existing.address = address || existing.address;
      } else {
        customers.push({ id: uid(), name, phone, email, address });
      }

      persist();
      alert("Saved. Refreshing page…");
      window.showPage("customers");
    });

    // save ticket -> creates job record (used by calendar)
    $("#saveTicket").addEventListener("click", () => {
      const date = $("#tDate").value;
      const frequency = $("#tFrequency").value;
      const subtotal = Number($("#tCharge").value || 0);
      const taxRate = 0.06625;
      const tax = +(subtotal * taxRate).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);

      const name = $("#tName").value.trim();
      const phone = $("#tPhone").value.trim();
      const email = $("#tEmail").value.trim();
      const address = $("#tAddress").value.trim();
      const notes = $("#tNotes").value.trim();

      if (!name) return alert("Customer name is required.");
      if (!date) return alert("Date is required.");

      // upsert customer so calendar autofill works next time
      let c = customers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase() && (x.phone || "") === phone)
        || customers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase());

      if (!c) {
        c = { id: uid(), name, phone, email, address };
        customers.push(c);
      } else {
        c.phone = phone || c.phone;
        c.email = email || c.email;
        c.address = address || c.address;
      }

      // store as a job (time optional; calendar page sets time)
      jobs.push({
        id: uid(),
        customerId: c.id,
        date,
        time: "", // optional here
        frequency,
        notes,
        subtotal,
        tax,
        total,
        address,
        phone,
        email,
      });

      persist();
      alert("Saved ticket. (You can schedule it on the Calendar.)");
      window.showPage("calendar");
    });

    $("#clearTicket").addEventListener("click", () => window.showPage("customers"));

    $("#emailReceipt").addEventListener("click", () => {
      const name = $("#tName").value.trim();
      const email = $("#tEmail").value.trim();
      const date = $("#tDate").value;
      const frequency = $("#tFrequency").value;
      const subtotal = Number($("#tCharge").value || 0);
      const tax = +(subtotal * 0.06625).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      const address = $("#tAddress").value.trim();

      if (!email) return alert("Enter an email first.");

      const subject = encodeURIComponent(`New Day Pest Control Receipt - ${date}`);
      const body = encodeURIComponent(
        `Receipt\n\nCustomer: ${name}\nDate: ${date}\nService: ${frequency}\nAddress: ${address}\n\nSubtotal: $${subtotal.toFixed(
          2
        )}\nNJ Tax (6.625%): $${tax.toFixed(2)}\nTotal: $${total.toFixed(2)}\n\nThank you!\nNew Day Pest Control`
      );

      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    });
  }

  function renderCalendar() {
    renderShell("calendar");
    const main = $("#mainPanel");
    const right = $("#rightPanel");

    // current week state
    const today = new Date();
    let weekStart = startOfWeekMon(today);

    function draw() {
      // toolbar + grid
      const weekEnd = addDays(weekStart, 6);
      const rangeLabel = `${fmtDate(weekStart)} → ${fmtDate(weekEnd)}`;

      main.innerHTML = `
        <div class="nd-topbar">
          <div>
            <h2 class="nd-h1">Calendar</h2>
            <div class="nd-sub">Click any time slot to schedule a job. (30-minute increments)</div>
          </div>
          <div class="nd-actions">
            <button class="nd-btn" id="prevWeek">← Week</button>
            <button class="nd-btn" id="todayWeek">Today</button>
            <button class="nd-btn" id="nextWeek">Week →</button>
          </div>
        </div>

        <div class="cal-toolbar">
          <div class="left">
            <div class="nd-pill">Week</div>
            <div class="range">${rangeLabel}</div>
          </div>
          <div class="nd-help">Tip: Saved customers auto-fill phone + address + email.</div>
        </div>

        <div class="nd-divider"></div>

        <div class="cal-wrap">
          <div class="cal-grid" id="calGrid"></div>
        </div>
      `;

      right.innerHTML = `
        <h3>Upcoming Jobs</h3>
        <div class="nd-help">From your saved jobs (local).</div>
        <div class="nd-divider"></div>
        ${
          jobs.length === 0
            ? `<div class="nd-empty">No jobs yet. Click a slot to schedule one.</div>`
            : `
              <table class="nd-table">
                <thead><tr><th>Date</th><th>Customer</th><th>Time</th></tr></thead>
                <tbody>
                  ${jobs
                    .slice()
                    .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time))
                    .slice(0, 15)
                    .map((j) => {
                      const c = customers.find(x => x.id === j.customerId);
                      return `<tr>
                        <td>${esc(j.date)}</td>
                        <td>${esc(c?.name || j.customerName || "—")}</td>
                        <td>${esc(j.time || "—")}</td>
                      </tr>`;
                    }).join("")}
                </tbody>
              </table>
            `
        }
        <div class="nd-divider"></div>
        <button class="nd-btn" id="goCustomers">Create Ticket</button>
      `;

      $("#goCustomers").addEventListener("click", () => window.showPage("customers"));

      $("#prevWeek").addEventListener("click", () => {
        weekStart = addDays(weekStart, -7);
        draw();
      });
      $("#nextWeek").addEventListener("click", () => {
        weekStart = addDays(weekStart, 7);
        draw();
      });
      $("#todayWeek").addEventListener("click", () => {
        weekStart = startOfWeekMon(new Date());
        draw();
      });

      // build calendar grid
      const grid = $("#calGrid");

      // Header row
      const header = document.createElement("div");
      header.className = "cal-grid cal-head";
      header.style.gridTemplateColumns = "86px repeat(7, minmax(150px, 1fr))";
      header.innerHTML = `<div class="cal-hcell" style="font-weight:950; color:var(--muted);">Time</div>`;

      const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        header.innerHTML += `
          <div class="cal-hcell">
            <div class="cal-hday">${dayNames[i]}</div>
            <div class="cal-hdate"><b>${fmtDate(d)}</b></div>
          </div>
        `;
      }
      grid.appendChild(header);

      // slots: 8:00 -> 18:00 in 30-min increments
      const startMin = 8 * 60;
      const endMin = 18 * 60;

      for (let mins = startMin; mins <= endMin; mins += 30) {
        // time column
        const t = document.createElement("div");
        t.className = "cal-time";
        t.textContent = timeLabel(mins);
        grid.appendChild(t);

        // day columns
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          const dateKey = fmtDate(d);
          const timeKey = `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;

          const cell = document.createElement("div");
          cell.className = "cal-cell";
          cell.setAttribute("data-date", dateKey);
          cell.setAttribute("data-time", timeKey);

          // show job if exists
          const hit = jobs.find((j) => j.date === dateKey && j.time === timeKey);
          if (hit) {
            const c = customers.find((x) => x.id === hit.customerId);
            const name = c?.name || hit.customerName || "Customer";
            const addr = hit.address || c?.address || "";
            cell.innerHTML = `
              <span class="cal-job">
                <span class="t">${esc(name)}</span>
                <span class="m">${esc(hit.frequency || "")}${addr ? " • " + esc(addr) : ""}</span>
              </span>
            `;
          } else {
            cell.innerHTML = `<span style="color:var(--muted); font-weight:800;">+</span>`;
          }

          cell.addEventListener("click", () => openScheduleModal(dateKey, timeKey));
          grid.appendChild(cell);
        }
      }
    }

    function openScheduleModal(date, time) {
      // simple prompt-based form (fast + reliable)
      // Step 1: choose customer
      let list = customers
        .slice()
        .sort((a,b)=> (a.name||"").localeCompare(b.name||""))
        .map((c, idx) => `${idx+1}) ${c.name} (${c.phone || "no phone"})`)
        .join("\n");

      let pick = prompt(
        `Schedule Job\n\nDate: ${date}\nTime: ${time}\n\nPick customer number, or type 0 to enter a new customer:\n\n${list || "(no customers saved yet)"}`
      );

      if (pick === null) return;
      pick = pick.trim();
      let chosenCustomer = null;

      if (pick !== "0" && pick !== "") {
        const idx = Number(pick) - 1;
        if (!Number.isNaN(idx) && customers[idx]) {
          chosenCustomer = customers[idx];
        }
      }

      let name = chosenCustomer?.name || prompt("Customer name:", "") || "";
      name = name.trim();
      if (!name) return alert("Customer name is required.");

      let phone = chosenCustomer?.phone || prompt("Phone:", "") || "";
      phone = phone.trim();

      let address = chosenCustomer?.address || prompt("Address (Street, City, NJ ZIP):", "") || "";
      address = address.trim();

      let email = chosenCustomer?.email || prompt("Email:", "") || "";
      email = email.trim();

      let frequency = prompt("Service frequency (One-time / Monthly / Quarterly):", "One-time") || "One-time";
      frequency = frequency.trim() || "One-time";

      let notes = prompt("Notes (optional):", "") || "";

      // upsert customer (database)
      let c =
        customers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase() && (x.phone || "") === phone) ||
        customers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase());

      if (!c) {
        c = { id: uid(), name, phone, email, address };
        customers.push(c);
      } else {
        c.phone = phone || c.phone;
        c.email = email || c.email;
        c.address = address || c.address;
      }

      // remove existing job in same slot (replace)
      jobs = jobs.filter((j) => !(j.date === date && j.time === time));

      // create job
      jobs.push({
        id: uid(),
        customerId: c.id,
        date,
        time,
        frequency,
        notes,
        subtotal: 0,
        tax: 0,
        total: 0,
        address: address || c.address || "",
        phone: phone || c.phone || "",
        email: email || c.email || "",
      });

      persist();
      alert(`Scheduled.\n\n${name}\n${date} @ ${time}\n\nMaps: ${mapsLink(address || c.address || "")}`);
      renderCalendar(); // redraw with updates
    }

    draw();
  }

  // placeholders for other menu items
  function renderComingSoon(pageName) {
    renderShell(pageName);
    $("#mainPanel").innerHTML = `
      <h2 class="nd-h1">${pageName[0].toUpperCase() + pageName.slice(1)}</h2>
      <div class="nd-sub">This section is coming next. For now, the working PestPac-style screen is under Customers and Calendar.</div>
    `;
    $("#rightPanel").innerHTML = `
      <h3>Next</h3>
      <div class="nd-help">Tell me what you want this page to do and I’ll build it.</div>
    `;
  }

  // ---------- entry ----------
  window.showPage = function showPage(page) {
    if (page === "customers") return renderCustomers();
    if (page === "calendar") return renderCalendar();
    if (["jobs", "materials", "contracts", "receipts"].includes(page)) return renderComingSoon(page);
    return renderCustomers();
  };

  // default
  window.showPage("customers");
})();
