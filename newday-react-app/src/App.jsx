import React, { useEffect, useMemo, useState } from "react";

const NJ_TAX = 0.06625;

const MENU = [
  { key: "customers", label: "Customers" },
  { key: "jobs", label: "Jobs" },
  { key: "calendar", label: "Calendar" },
  { key: "materials", label: "Materials" },
  { key: "contracts", label: "Contracts" },
  { key: "receipts", label: "Receipts" },
];

const SERVICE_TYPES = ["One-time", "Monthly", "Quarterly"];
const PESTS = [
  "Ants",
  "Mice",
  "Rats",
  "Spiders",
  "Roaches",
  "Bed Bugs",
  "Wasps",
  "Bees",
  "Hornets",
  "Yellow Jackets",
  "Termites",
  "Mosquitoes",
  "Fleas/Ticks",
  "Other",
];

function fmtDate(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // Monday=0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function uuid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export default function App() {
  const [active, setActive] = useState("customers");

  // Saved tickets (Customers screen)
  const [tickets, setTickets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nd_tickets") || "[]");
    } catch {
      return [];
    }
  });

  // Calendar jobs
  const [jobs, setJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nd_jobs") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("nd_tickets", JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem("nd_jobs", JSON.stringify(jobs));
  }, [jobs]);

  // Shared: show a tiny “saved tickets” panel on right like your screenshot
  const savedCount = tickets.length;

  return (
    <div className="nd-root">
      <style>{styles}</style>

      {/* Top bar */}
      <header className="nd-top">
        <div className="nd-brand">
          <div className="nd-badge">ND</div>
          <div className="nd-brandtext">
            <div className="nd-title">New Day Pest Control</div>
            <div className="nd-subtitle">(201) 972-5592 • newdaypestcontrol@yahoo.com</div>
          </div>
        </div>

        <div className="nd-topright">
          <span className="nd-pill">NJ Tax: {(NJ_TAX * 100).toFixed(3)}%</span>
          <div className="nd-pageTitle">
            {active === "customers" ? "Customers / Service Ticket" : MENU.find(m => m.key === active)?.label}
          </div>
        </div>
      </header>

      <div className="nd-layout">
        {/* Left menu */}
        <aside className="nd-sidebar">
          <div className="nd-menuTitle">MENU</div>
          <nav className="nd-menu">
            {MENU.map((m) => (
              <button
                key={m.key}
                className={"nd-menuItem " + (active === m.key ? "active" : "")}
                onClick={() => setActive(m.key)}
              >
                {m.label}
              </button>
            ))}
          </nav>

          <div className="nd-status">
            <div className="nd-statusLabel">Status</div>
            <div className="nd-statusText">
              Local save: <b>ON</b> (browser)
            </div>
          </div>
        </aside>

        {/* Center content */}
        <main className="nd-main">
          {active === "customers" && (
            <CustomersTicket
              tickets={tickets}
              setTickets={setTickets}
            />
          )}

          {active === "calendar" && (
            <Calendar
              jobs={jobs}
              setJobs={setJobs}
            />
          )}

          {active !== "customers" && active !== "calendar" && (
            <PlaceholderPage page={MENU.find(m => m.key === active)?.label || "Page"} />
          )}
        </main>

        {/* Right panel */}
        <aside className="nd-right">
          <div className="nd-card">
            <div className="nd-cardHead">
              <div>
                <div className="nd-cardTitle">Saved Tickets</div>
                <div className="nd-cardSub">Click a row to load it back into the form.</div>
              </div>
              <div className="nd-countPill">{savedCount} saved</div>
            </div>

            <div className="nd-table">
              <div className="nd-tableRow nd-tableHead">
                <div>Date</div>
                <div>Customer</div>
                <div>Pest</div>
                <div className="right">Total</div>
              </div>

              {tickets.length === 0 ? (
                <div className="nd-empty">
                  No saved tickets yet. Fill the form and click <b>Save</b>.
                </div>
              ) : (
                tickets.slice().reverse().slice(0, 8).map((t) => (
                  <div className="nd-tableRow" key={t.id}>
                    <div>{t.date}</div>
                    <div className="truncate">{t.customerName || "-"}</div>
                    <div className="truncate">{(t.pests || []).join(", ") || "-"}</div>
                    <div className="right">${Number(t.total || 0).toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="nd-note">
              Next step after you confirm this looks right: we’ll add a real database + real login + real email sending.
            </div>
          </div>

          <div className="nd-card">
            <div className="nd-cardHead">
              <div>
                <div className="nd-cardTitle">Scheduled Jobs</div>
                <div className="nd-cardSub">Upcoming from Calendar</div>
              </div>
              <div className="nd-countPill">{jobs.length}</div>
            </div>

            <div className="nd-table">
              <div className="nd-tableRow nd-tableHead">
                <div>Date</div>
                <div>Time</div>
                <div>Customer</div>
                <div className="right">Type</div>
              </div>

              {jobs.length === 0 ? (
                <div className="nd-empty">
                  No jobs scheduled yet. Add one in <b>Calendar</b>.
                </div>
              ) : (
                jobs
                  .slice()
                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                  .slice(0, 10)
                  .map((j) => (
                    <div className="nd-tableRow" key={j.id}>
                      <div>{j.date}</div>
                      <div>{j.time}</div>
                      <div className="truncate">{j.customerName || "-"}</div>
                      <div className="right">{j.serviceType || "-"}</div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PlaceholderPage({ page }) {
  return (
    <div className="nd-card big">
      <div className="nd-h1">{page}</div>
      <div className="nd-muted">
        This section is coming next. For now, the working PestPac-style screen is under <b>Customers</b>.
      </div>
    </div>
  );
}

function CustomersTicket({ tickets, setTickets }) {
  const [date, setDate] = useState(() => fmtDate(new Date()));
  const [serviceType, setServiceType] = useState("One-time");
  const [charge, setCharge] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");

  const [pests, setPests] = useState([]);

  // Chemicals list (editable rows)
  const [chemRows, setChemRows] = useState(() => [
    { id: uuid(), chemical: "", amount: "", unit: "oz", mix: "" },
  ]);

  const [notes, setNotes] = useState("");

  const subtotal = useMemo(() => {
    const n = Number(charge || 0);
    return isNaN(n) ? 0 : n;
  }, [charge]);

  const tax = useMemo(() => subtotal * NJ_TAX, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  function togglePest(p) {
    setPests((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function addChem() {
    setChemRows((r) => [...r, { id: uuid(), chemical: "", amount: "", unit: "oz", mix: "" }]);
  }

  function updateChem(id, patch) {
    setChemRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeChem(id) {
    setChemRows((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  function clearForm() {
    setDate(fmtDate(new Date()));
    setServiceType("One-time");
    setCharge("");
    setCustomerName("");
    setPhone("");
    setAddress("");
    setEmail("");
    setPests([]);
    setChemRows([{ id: uuid(), chemical: "", amount: "", unit: "oz", mix: "" }]);
    setNotes("");
  }

  function saveTicket() {
    const ticket = {
      id: uuid(),
      date,
      serviceType,
      charge: subtotal,
      tax,
      total,
      customerName,
      phone,
      address,
      email,
      pests,
      chemicals: chemRows,
      notes,
      createdAt: Date.now(),
    };
    setTickets((t) => [...t, ticket]);
  }

  return (
    <div className="nd-card big">
      <div className="nd-headRow">
        <div>
          <div className="nd-h1">Service Ticket</div>
          <div className="nd-muted">Customer + job details, chemicals, notes, totals, and receipt.</div>
        </div>
        <div className="nd-actions">
          <button className="nd-btn primary" onClick={saveTicket}>Save</button>
          <button className="nd-btn" onClick={clearForm}>Clear</button>
        </div>
      </div>

      <div className="nd-grid3">
        <Field label="Date">
          <input className="nd-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Service Type">
          <select className="nd-input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Charge (subtotal)">
          <input
            className="nd-input"
            inputMode="decimal"
            placeholder="e.g. 149.00"
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
          />
        </Field>
      </div>

      <div className="nd-grid2">
        <Field label="Customer Name">
          <input className="nd-input" placeholder="Customer full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className="nd-input" placeholder="(###) ###-####" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>

      <Field label="Address">
        <input className="nd-input" placeholder="Street, City, NJ ZIP" value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>

      <Field label="Email">
        <input className="nd-input" placeholder="customer@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>

      <div className="nd-card inner">
        <div className="nd-h2Row">
          <div>
            <div className="nd-h2">Service Type (Pest)</div>
          </div>
          <div className="nd-muted">Select all that apply</div>
        </div>

        <div className="nd-chipRow">
          {PESTS.map((p) => (
            <button
              key={p}
              className={"nd-chip " + (pests.includes(p) ? "on" : "")}
              onClick={() => togglePest(p)}
              type="button"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="nd-card inner">
        <div className="nd-h2Row">
          <div>
            <div className="nd-h2">Chemicals Used</div>
            <div className="nd-muted">Multiple chemicals per job • amount used • mix ratio • editable</div>
          </div>
          <button className="nd-btn small" onClick={addChem} type="button">+ Add Chemical</button>
        </div>

        <div className="nd-chemHeader">
          <div>Chemical</div>
          <div>Amount Used</div>
          <div>Unit</div>
          <div>Mix Ratio</div>
          <div></div>
        </div>

        {chemRows.map((r) => (
          <div className="nd-chemRow" key={r.id}>
            <input
              className="nd-input"
              placeholder="Type chemical name (editable)"
              value={r.chemical}
              onChange={(e) => updateChem(r.id, { chemical: e.target.value })}
            />
            <input
              className="nd-input"
              placeholder="e.g. 2.5"
              value={r.amount}
              onChange={(e) => updateChem(r.id, { amount: e.target.value })}
            />
            <select
              className="nd-input"
              value={r.unit}
              onChange={(e) => updateChem(r.id, { unit: e.target.value })}
            >
              <option value="oz">oz</option>
              <option value="ml">ml</option>
              <option value="gal">gal</option>
              <option value="lb">lb</option>
              <option value="g">g</option>
            </select>
            <input
              className="nd-input"
              placeholder='e.g. "1 oz / 1 gal"'
              value={r.mix}
              onChange={(e) => updateChem(r.id, { mix: e.target.value })}
            />
            <button className="nd-x" onClick={() => removeChem(r.id)} title="Remove" type="button">×</button>
          </div>
        ))}
      </div>

      <Field label="Notes">
        <textarea className="nd-input" rows={4} placeholder="Job notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="nd-totals">
        <div className="nd-totalRow">
          <div className="nd-muted">Subtotal</div>
          <div>${subtotal.toFixed(2)}</div>
        </div>
        <div className="nd-totalRow">
          <div className="nd-muted">NJ Tax ({(NJ_TAX * 100).toFixed(3)}%)</div>
          <div>${tax.toFixed(2)}</div>
        </div>
        <div className="nd-totalRow bold">
          <div>Total</div>
          <div>${total.toFixed(2)}</div>
        </div>

        <div className="nd-muted" style={{ marginTop: 10 }}>
          Email sending from a web-only app needs a backend (Netlify Functions). For now, we can add a “mailto:” button next.
        </div>
      </div>
    </div>
  );
}

function Calendar({ jobs, setJobs }) {
  const [weekOf, setWeekOf] = useState(() => startOfWeek(new Date()));
  const days = useMemo(() => [...Array(7)].map((_, i) => addDays(weekOf, i)), [weekOf]);

  // 30-minute slots from 7:00 to 19:00
  const slots = useMemo(() => {
    const arr = [];
    for (let h = 7; h <= 19; h++) {
      arr.push(`${String(h).padStart(2, "0")}:00`);
      if (h !== 19) arr.push(`${String(h).padStart(2, "0")}:30`);
    }
    return arr;
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    id: "",
    date: fmtDate(new Date()),
    time: "09:00",
    customerName: "",
    serviceType: "One-time",
    pests: [],
    notes: "",
  }));

  const weekJobs = useMemo(() => {
    const start = fmtDate(weekOf);
    const end = fmtDate(addDays(weekOf, 6));
    return jobs.filter((j) => j.date >= start && j.date <= end);
  }, [jobs, weekOf]);

  function openNew(dateStr, timeStr) {
    setForm({
      id: "",
      date: dateStr,
      time: timeStr,
      customerName: "",
      serviceType: "One-time",
      pests: [],
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(job) {
    setForm({
      id: job.id,
      date: job.date,
      time: job.time,
      customerName: job.customerName || "",
      serviceType: job.serviceType || "One-time",
      pests: job.pests || [],
      notes: job.notes || "",
    });
    setModalOpen(true);
  }

  function togglePest(p) {
    setForm((f) => ({
      ...f,
      pests: f.pests.includes(p) ? f.pests.filter((x) => x !== p) : [...f.pests, p],
    }));
  }

  function saveJob() {
    if (!form.customerName.trim()) {
      alert("Enter customer name");
      return;
    }
    const payload = { ...form, id: form.id || uuid() };
    setJobs((prev) => {
      const exists = prev.some((j) => j.id === payload.id);
      return exists ? prev.map((j) => (j.id === payload.id ? payload : j)) : [...prev, payload];
    });
    setModalOpen(false);
  }

  function deleteJob(id) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function prevWeek() {
    setWeekOf((w) => addDays(w, -7));
  }

  function nextWeek() {
    setWeekOf((w) => addDays(w, 7));
  }

  return (
    <div className="nd-card big">
      <div className="nd-headRow">
        <div>
          <div className="nd-h1">Calendar</div>
          <div className="nd-muted">
            Weekly schedule (30-minute slots). Click a slot to schedule a job.
          </div>
        </div>

        <div className="nd-actions">
          <button className="nd-btn" onClick={prevWeek}>← Prev</button>
          <button className="nd-btn" onClick={() => setWeekOf(startOfWeek(new Date()))}>Today</button>
          <button className="nd-btn" onClick={nextWeek}>Next →</button>
        </div>
      </div>

      <div className="nd-weekHeader">
        <div className="nd-weekHeaderLeft">Time</div>
        {days.map((d) => (
          <div key={fmtDate(d)} className="nd-weekDay">
            <div className="nd-weekDayTop">
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div className="nd-muted">{fmtDate(d)}</div>
          </div>
        ))}
      </div>

      <div className="nd-weekGrid">
        {slots.map((t) => (
          <React.Fragment key={t}>
            <div className="nd-timeCell">{t}</div>
            {days.map((d) => {
              const dateStr = fmtDate(d);
              const cellJobs = weekJobs
                .filter((j) => j.date === dateStr && j.time === t)
                .slice(0, 2);

              const extra = weekJobs.filter((j) => j.date === dateStr && j.time === t).length - cellJobs.length;

              return (
                <div
                  key={dateStr + t}
                  className="nd-slot"
                  onClick={() => openNew(dateStr, t)}
                  title="Click to add job"
                >
                  {cellJobs.map((j) => (
                    <div
                      key={j.id}
                      className="nd-jobPill"
                      onClick={(e) => { e.stopPropagation(); openEdit(j); }}
                      title="Click to edit"
                    >
                      <div className="nd-jobName">{j.customerName}</div>
                      <div className="nd-jobMeta">
                        {j.serviceType} • {(j.pests || []).slice(0, 2).join(", ")}
                      </div>
                    </div>
                  ))}
                  {extra > 0 && <div className="nd-more">+{extra} more</div>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {modalOpen && (
        <div className="nd-modalBackdrop" onClick={() => setModalOpen(false)}>
          <div className="nd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nd-h2Row" style={{ marginBottom: 10 }}>
              <div>
                <div className="nd-h2">{form.id ? "Edit Job" : "New Job"}</div>
                <div className="nd-muted">{form.date} @ {form.time}</div>
              </div>
              <div className="nd-actions">
                {form.id && (
                  <button className="nd-btn danger" onClick={() => { deleteJob(form.id); setModalOpen(false); }}>
                    Delete
                  </button>
                )}
                <button className="nd-btn" onClick={() => setModalOpen(false)}>Close</button>
                <button className="nd-btn primary" onClick={saveJob}>Save</button>
              </div>
            </div>

            <div className="nd-grid2">
              <Field label="Date">
                <input className="nd-input" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
              </Field>
              <Field label="Time">
                <select className="nd-input" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}>
                  {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Customer Name">
              <input className="nd-input" value={form.customerName} onChange={(e) => setForm(f => ({ ...f, customerName: e.target.value }))} />
            </Field>

            <Field label="Service Type">
              <select className="nd-input" value={form.serviceType} onChange={(e) => setForm(f => ({ ...f, serviceType: e.target.value }))}>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <div className="nd-card inner">
              <div className="nd-h2Row">
                <div className="nd-h2">Pest</div>
                <div className="nd-muted">Select all that apply</div>
              </div>
              <div className="nd-chipRow">
                {PESTS.map((p) => (
                  <button
                    key={p}
                    className={"nd-chip " + (form.pests.includes(p) ? "on" : "")}
                    onClick={() => togglePest(p)}
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Notes">
              <textarea className="nd-input" rows={4} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="nd-field">
      <div className="nd-label">{label}</div>
      {children}
    </div>
  );
}

const styles = `
  :root{
    --green:#147a2a;
    --green-2:#0f5f20;
    --bg:#f6f7f9;
    --card:#ffffff;
    --line:#e6e8ee;
    --text:#111827;
    --muted:#6b7280;
    --shadow:0 10px 25px rgba(0,0,0,.06);
    --radius:16px;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; color:var(--text); background:var(--bg);}
  .nd-root{min-height:100vh;}
  .nd-top{
    background:#fff;border-bottom:1px solid var(--line);
    padding:14px 18px; display:flex; align-items:center; justify-content:space-between;
    position:sticky; top:0; z-index:5;
  }
  .nd-brand{display:flex; gap:12px; align-items:center;}
  .nd-badge{
    width:44px;height:44px;border-radius:12px;background:var(--green);
    display:grid;place-items:center;color:#fff;font-weight:800;
  }
  .nd-title{font-weight:800;}
  .nd-subtitle{color:var(--muted); font-size:13px;}
  .nd-topright{display:flex; align-items:center; gap:14px;}
  .nd-pill{
    border:1px solid #bfe4c6; background:#e9f7ed; color:var(--green-2);
    padding:7px 10px; border-radius:999px; font-weight:700; font-size:13px;
  }
  .nd-pageTitle{font-weight:800; color:var(--green-2); font-size:18px;}
  .nd-layout{display:grid; grid-template-columns:260px 1fr 340px; gap:16px; padding:16px;}
  .nd-sidebar{
    background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
    box-shadow:var(--shadow); padding:14px;
    height:calc(100vh - 92px); position:sticky; top:92px; align-self:start;
    display:flex; flex-direction:column;
  }
  .nd-menuTitle{font-weight:900; color:var(--green-2); margin-bottom:10px;}
  .nd-menu{display:flex; flex-direction:column; gap:6px;}
  .nd-menuItem{
    text-align:left; border:none; background:transparent; padding:10px 12px;
    border-radius:12px; font-weight:800; cursor:pointer; color:#111;
  }
  .nd-menuItem:hover{background:#f2f5f9;}
  .nd-menuItem.active{
    background:#e9f7ed; color:var(--green-2); position:relative;
  }
  .nd-menuItem.active::before{
    content:""; position:absolute; left:0; top:8px; bottom:8px; width:4px; border-radius:999px; background:var(--green);
  }
  .nd-status{margin-top:auto; padding-top:12px; border-top:1px solid var(--line);}
  .nd-statusLabel{font-weight:900; color:var(--muted); margin-bottom:6px;}
  .nd-statusText{color:var(--muted); font-size:13px;}
  .nd-main{min-height:calc(100vh - 92px);}
  .nd-right{display:flex; flex-direction:column; gap:16px;}
  .nd-card{
    background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
    box-shadow:var(--shadow); padding:16px;
  }
  .nd-card.big{padding:18px;}
  .nd-card.inner{margin-top:14px; padding:14px; border-radius:14px;}
  .nd-cardHead{display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:10px;}
  .nd-cardTitle{font-weight:900;}
  .nd-cardSub{color:var(--muted); font-size:13px; margin-top:2px;}
  .nd-countPill{
    border:1px solid #bfe4c6; background:#e9f7ed; color:var(--green-2);
    padding:7px 10px; border-radius:999px; font-weight:800; font-size:13px;
    white-space:nowrap;
  }
  .nd-table{border:1px solid var(--line); border-radius:12px; overflow:hidden;}
  .nd-tableRow{display:grid; grid-template-columns:80px 1fr 1fr 80px; gap:10px; padding:10px 12px; border-top:1px solid var(--line); background:#fff;}
  .nd-tableRow:first-child{border-top:none;}
  .nd-tableHead{background:#eef7f0; font-weight:900; color:var(--green-2);}
  .nd-empty{padding:12px; color:var(--muted);}
  .nd-note{margin-top:10px; color:var(--muted); font-size:13px;}
  .right{text-align:right;}
  .truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .nd-headRow{display:flex; align-items:flex-start; justify-content:space-between; gap:12px;}
  .nd-h1{font-weight:950; font-size:22px;}
  .nd-h2{font-weight:950; font-size:16px;}
  .nd-muted{color:var(--muted); font-size:13px; margin-top:3px;}
  .nd-actions{display:flex; gap:10px; align-items:center;}
  .nd-btn{
    border:1px solid var(--line); background:#fff; padding:10px 14px;
    border-radius:12px; font-weight:900; cursor:pointer;
  }
  .nd-btn:hover{background:#f6f7f9;}
  .nd-btn.primary{background:var(--green); border-color:var(--green); color:#fff;}
  .nd-btn.primary:hover{background:var(--green-2);}
  .nd-btn.small{padding:8px 12px;}
  .nd-btn.danger{border-color:#fecaca; background:#fff5f5; color:#b91c1c;}
  .nd-field{margin-top:12px;}
  .nd-label{font-weight:900; margin-bottom:6px;}
  .nd-input{
    width:100%; border:1px solid var(--line); border-radius:12px;
    padding:10px 12px; font-size:14px; outline:none;
  }
  .nd-input:focus{border-color:#9bd3a6; box-shadow:0 0 0 4px rgba(20,122,42,.12);}
  .nd-grid2{display:grid; grid-template-columns:1.2fr 1fr; gap:12px; margin-top:12px;}
  .nd-grid3{display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:12px;}
  @media (max-width:1200px){
    .nd-layout{grid-template-columns:260px 1fr;}
    .nd-right{grid-column:1 / -1;}
  }
  @media (max-width:820px){
    .nd-layout{grid-template-columns:1fr;}
    .nd-sidebar{position:relative; top:auto; height:auto;}
  }
  .nd-h2Row{display:flex; align-items:flex-start; justify-content:space-between; gap:10px;}
  .nd-chipRow{display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;}
  .nd-chip{
    border:1px solid var(--line); background:#fff; padding:8px 12px;
    border-radius:999px; font-weight:900; cursor:pointer;
  }
  .nd-chip.on{background:#e9f7ed; border-color:#bfe4c6; color:var(--green-2);}
  .nd-chemHeader{
    display:grid; grid-template-columns:1.5fr .8fr .6fr 1fr 40px; gap:10px;
    font-weight:900; color:var(--muted); margin-top:10px; font-size:13px;
  }
  .nd-chemRow{
    display:grid; grid-template-columns:1.5fr .8fr .6fr 1fr 40px; gap:10px;
    margin-top:10px; align-items:center;
  }
  .nd-x{
    width:36px;height:36px;border-radius:12px;border:1px solid var(--line);
    background:#fff; font-weight:950; cursor:pointer;
  }
  .nd-x:hover{background:#f6f7f9;}
  .nd-totals{
    margin-top:14px; border-top:1px solid var(--line); padding-top:12px;
    display:flex; flex-direction:column; gap:8px;
  }
  .nd-totalRow{display:flex; justify-content:space-between; align-items:center;}
  .nd-totalRow.bold{font-weight:950; font-size:16px;}

  /* Calendar */
  .nd-weekHeader{
    display:grid; grid-template-columns:90px repeat(7, 1fr);
    gap:8px; margin-top:14px;
  }
  .nd-weekHeaderLeft{
    font-weight:900; color:var(--muted); padding:10px 0;
  }
  .nd-weekDay{
    background:#fff; border:1px solid var(--line); border-radius:12px;
    padding:10px 10px;
  }
  .nd-weekDayTop{font-weight:950;}
  .nd-weekGrid{
    margin-top:8px;
    display:grid;
    grid-template-columns:90px repeat(7, 1fr);
    gap:8px;
  }
  .nd-timeCell{
    color:var(--muted); font-weight:900; padding:10px 0; font-size:13px;
  }
  .nd-slot{
    border:1px solid var(--line);
    border-radius:12px;
    min-height:54px;
    background:#fff;
    padding:6px;
    cursor:pointer;
  }
  .nd-slot:hover{outline:3px solid rgba(20,122,42,.10);}
  .nd-jobPill{
    background:#e9f7ed;
    border:1px solid #bfe4c6;
    border-radius:10px;
    padding:6px 8px;
    margin-bottom:6px;
    cursor:pointer;
  }
  .nd-jobPill:hover{background:#def3e4;}
  .nd-jobName{font-weight:950; font-size:13px;}
  .nd-jobMeta{font-size:12px; color:var(--green-2); margin-top:2px;}
  .nd-more{font-size:12px; color:var(--muted); font-weight:900; padding:2px 4px;}

  /* Modal */
  .nd-modalBackdrop{
    position:fixed; inset:0; background:rgba(17,24,39,.45);
    display:grid; place-items:center; z-index:50;
    padding:16px;
  }
  .nd-modal{
    width:min(760px, 100%);
    background:#fff;
    border-radius:18px;
    border:1px solid var(--line);
    box-shadow:0 30px 80px rgba(0,0,0,.25);
    padding:16px;
  }
`;

