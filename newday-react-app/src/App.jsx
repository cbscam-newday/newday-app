 import React, { useEffect, useMemo, useRef, useState } from "react";

const NJ_TAX = 0.06625;

const PESTS = [
  "Ants","Mice","Rats","Spiders","Roaches","Bed Bugs","Wasps","Bees","Hornets",
  "Yellow Jackets","Termites","Mosquitoes","Fleas/Ticks","Other",
];

const SERVICE_TYPES = ["One-time", "Monthly", "Quarterly"];

const CHEMICALS = [
  { name: "FirstStrike Soft Bait", epa: "7173-258" },
  { name: "CB-80 Insecticide Aerosol", epa: "279-3393" },
  { name: "Transport Mikron Insecticide", epa: "8033-109-279" },
  { name: "Transport GHP Insecticide", epa: "8033-96-279" },
];

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function ymd(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun - 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeLabel(h, m) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
}

function mapsLink(address) {
  const q = encodeURIComponent(address || "");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function money(n) {
  const x = Number(n || 0);
  return x.toFixed(2);
}

export default function App() {
  const [page, setPage] = useState("Customers");

  const [customers, setCustomers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nd_customers") || "[]"); } catch { return []; }
  });
  const [jobs, setJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nd_jobs") || "[]"); } catch { return []; }
  });

  useEffect(() => localStorage.setItem("nd_customers", JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem("nd_jobs", JSON.stringify(jobs)), [jobs]);

  // Shared “active job” (Calendar click fills this, Customers page edits/saves it)
  const blankJob = useMemo(() => ({
    id: uid(),
    date: formatDate(new Date()),
    time: "",
    serviceType: "One-time",
    customerName: "",
    phone: "",
    email: "",
    address: "",
    pests: [],
    chemicals: [{ id: uid(), name: "", epa: "", amount: "", unit: "oz", mix: "" }],
    notes: "",
    charge: "",
    taxRate: NJ_TAX,
    signatureDataUrl: "",
  }), []);

  const [jobDraft, setJobDraft] = useState(blankJob);

  // Autofill: when typing customer name, if exact match, fill details but still editable
  useEffect(() => {
    const match = customers.find(c => c.name.trim().toLowerCase() === jobDraft.customerName.trim().toLowerCase());
    if (!match) return;
    setJobDraft(j => ({
      ...j,
      phone: j.phone || match.phone || "",
      email: j.email || match.email || "",
      address: j.address || match.address || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobDraft.customerName]);

  const totals = useMemo(() => {
    const subtotal = Number(jobDraft.charge || 0);
    const tax = subtotal * (jobDraft.taxRate ?? NJ_TAX);
    return { subtotal, tax, total: subtotal + tax };
  }, [jobDraft.charge, jobDraft.taxRate]);

  function saveCustomerFromDraft() {
    const name = jobDraft.customerName.trim();
    if (!name) return alert("Enter customer name first.");
    const next = {
      id: uid(),
      name,
      phone: jobDraft.phone.trim(),
      email: jobDraft.email.trim(),
      address: jobDraft.address.trim(),
    };
    setCustomers(prev => {
      const existingIdx = prev.findIndex(c => c.name.trim().toLowerCase() === name.toLowerCase());
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], ...next, id: copy[existingIdx].id };
        return copy;
      }
      return [next, ...prev];
    });
    alert("Customer saved (local).");
  }

  function saveJob() {
    if (!jobDraft.date || !jobDraft.time) return alert("Pick a date and time.");
    if (!jobDraft.customerName.trim()) return alert("Enter customer name.");
    setJobs(prev => {
      const existingIdx = prev.findIndex(j => j.id === jobDraft.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...jobDraft };
        return copy;
      }
      return [{ ...jobDraft }, ...prev];
    });
    alert("Job saved (local).");
  }

  function clearJob() {
    setJobDraft({ ...blankJob, id: uid() });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">ND</div>
          <div>
            <div className="title">New Day Pest Control</div>
            <div className="subtitle">(201) 972-5592 • newdaypestcontrol@yahoo.com</div>
          </div>
        </div>

        <div className="topright">
          <div className="pill">NJ Tax: 6.625%</div>
          <div className="crumb">{page}</div>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <div className="menuTitle">MENU</div>
          {["Customers","Calendar","Jobs","Materials","Contracts","Receipts"].map(p => (
            <button
              key={p}
              className={"navBtn " + (page === p ? "active" : "")}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <div className="status">
            <div className="statusTitle">Status</div>
            <div className="statusLine">Local save: <b>ON</b> (browser)</div>
          </div>
        </aside>

        <main className="main">
          {page === "Customers" && (
            <CustomersPage
              jobDraft={jobDraft}
              setJobDraft={setJobDraft}
              totals={totals}
              customers={customers}
              jobs={jobs}
              onSaveJob={saveJob}
              onClear={clearJob}
              onSaveCustomer={saveCustomerFromDraft}
            />
          )}

          {page === "Calendar" && (
            <CalendarPage
              jobs={jobs}
              customers={customers}
              onCreateAt={(dateStr, timeStr) => {
                setJobDraft(j => ({
                  ...j,
                  id: uid(),
                  date: dateStr,
                  time: timeStr,
                }));
                setPage("Customers");
              }}
            />
          )}

          {page !== "Customers" && page !== "Calendar" && (
            <div className="card">
              <div className="h1">{page}</div>
              <div className="muted">
                This section is coming next. The working PestPac-style screen is under <b>Customers</b>.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function CustomersPage({ jobDraft, setJobDraft, totals, customers, jobs, onSaveJob, onClear, onSaveCustomer }) {
  const customerNames = customers.map(c => c.name);

  function setField(k, v) {
    setJobDraft(prev => ({ ...prev, [k]: v }));
  }

  function togglePest(p) {
    setJobDraft(prev => {
      const has = prev.pests.includes(p);
      return { ...prev, pests: has ? prev.pests.filter(x => x !== p) : [...prev.pests, p] };
    });
  }

  function addChemicalRow() {
    setJobDraft(prev => ({
      ...prev,
      chemicals: [...prev.chemicals, { id: uid(), name: "", epa: "", amount: "", unit: "oz", mix: "" }],
    }));
  }

  function updateChemical(id, patch) {
    setJobDraft(prev => ({
      ...prev,
      chemicals: prev.chemicals.map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  function removeChemical(id) {
    setJobDraft(prev => ({
      ...prev,
      chemicals: prev.chemicals.filter(r => r.id !== id),
    }));
  }

  return (
    <div className="grid3">
      <section className="card span2">
        <div className="cardHeader">
          <div>
            <div className="h1">Service Ticket</div>
            <div className="muted">Customer + job details, chemicals, notes, totals, and receipt.</div>
          </div>
          <div className="actions">
            <button className="btnPrimary" onClick={onSaveJob}>Save</button>
            <button className="btn" onClick={onClear}>Clear</button>
          </div>
        </div>

        <div className="row3">
          <div className="field">
            <label>Date</label>
            <input value={jobDraft.date} onChange={e => setField("date", e.target.value)} />
          </div>
          <div className="field">
            <label>Time</label>
            <input placeholder="e.g. 9:30 AM" value={jobDraft.time} onChange={e => setField("time", e.target.value)} />
          </div>
          <div className="field">
            <label>Service Type</label>
            <select value={jobDraft.serviceType} onChange={e => setField("serviceType", e.target.value)}>
              {SERVICE_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>

        <div className="row2">
          <div className="field">
            <label>Customer Name (autofill or manual)</label>
            <input
              list="customerNames"
              placeholder="Start typing a saved customer… or type new"
              value={jobDraft.customerName}
              onChange={e => setField("customerName", e.target.value)}
            />
            <datalist id="customerNames">
              {customerNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Phone</label>
            <input placeholder="(###) ###-####" value={jobDraft.phone} onChange={e => setField("phone", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Address</label>
          <div className="withLink">
            <input
              placeholder="Street, City, NJ ZIP"
              value={jobDraft.address}
              onChange={e => setField("address", e.target.value)}
            />
            <a className={"mapBtn " + (!jobDraft.address ? "disabled" : "")} href={mapsLink(jobDraft.address)} target="_blank" rel="noreferrer">
              Map
            </a>
          </div>
        </div>

        <div className="field">
          <label>Email</label>
          <input placeholder="customer@email.com" value={jobDraft.email} onChange={e => setField("email", e.target.value)} />
        </div>

        <div className="card inner">
          <div className="innerHeader">
            <div className="h2">Service Type (Pest)</div>
            <div className="muted">Select all that apply</div>
          </div>
          <div className="chips">
            {PESTS.map(p => (
              <button
                key={p}
                type="button"
                className={"chip " + (jobDraft.pests.includes(p) ? "on" : "")}
                onClick={() => togglePest(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="card inner">
          <div className="innerHeaderRow">
            <div>
              <div className="h2">Chemicals Used</div>
              <div className="muted">Multiple chemicals per job • amount used • mix ratio • editable</div>
            </div>
            <button className="btnGreen" onClick={addChemicalRow}>+ Add Chemical</button>
          </div>

          <div className="chemGridHead">
            <div>Chemical</div>
            <div>EPA #</div>
            <div>Amount</div>
            <div>Unit</div>
            <div>Mix Ratio</div>
            <div></div>
          </div>

          {jobDraft.chemicals.map(row => (
            <div className="chemGridRow" key={row.id}>
              <select
                value={row.name}
                onChange={e => {
                  const selected = CHEMICALS.find(c => c.name === e.target.value);
                  updateChemical(row.id, { name: e.target.value, epa: selected?.epa || row.epa });
                }}
              >
                <option value="">Select…</option>
                {CHEMICALS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>

              <input
                value={row.epa}
                placeholder="EPA #"
                onChange={e => updateChemical(row.id, { epa: e.target.value })}
              />

              <input
                value={row.amount}
                placeholder="e.g. 2.5"
                onChange={e => updateChemical(row.id, { amount: e.target.value })}
              />

              <select value={row.unit} onChange={e => updateChemical(row.id, { unit: e.target.value })}>
                <option value="oz">oz</option>
                <option value="gal">gal</option>
                <option value="lb">lb</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>

              <input
                value={row.mix}
                placeholder='e.g. "1 oz / 1 gal"'
                onChange={e => updateChemical(row.id, { mix: e.target.value })}
              />

              <button className="xBtn" onClick={() => removeChemical(row.id)}>×</button>
            </div>
          ))}
        </div>

        <div className="row2">
          <div className="field">
            <label>Notes</label>
            <textarea rows={4} value={jobDraft.notes} onChange={e => setField("notes", e.target.value)} />
          </div>
          <div className="card inner">
            <div className="h2">Totals</div>
            <div className="row2">
              <div className="field">
                <label>Charge (subtotal)</label>
                <input placeholder="e.g. 149.00" value={jobDraft.charge} onChange={e => setField("charge", e.target.value)} />
              </div>
              <div className="field">
                <label>Tax</label>
                <input value={money(totals.tax)} readOnly />
              </div>
            </div>
            <div className="field">
              <label>Total</label>
              <input value={money(totals.total)} readOnly />
            </div>

            <div className="rowButtons">
              <button className="btnPrimary" onClick={onSaveJob}>Save Job</button>
              <button className="btn" onClick={onSaveCustomer}>Save Customer</button>
            </div>

            <div className="mutedSmall">
              Email receipt + real database + login comes next (this version saves locally).
            </div>
          </div>
        </div>
      </section>

      <aside className="card">
        <div className="h2">Saved Jobs</div>
        <div className="muted">Click a row to load it back into the form.</div>

        <div className="table">
          <div className="tHead">
            <div>Date</div><div>Time</div><div>Customer</div><div>Total</div>
          </div>
          {jobs.length === 0 && <div className="tEmpty">No saved jobs yet.</div>}
          {jobs.map(j => (
            <button
              key={j.id}
              className="tRow"
              onClick={() => setJobDraft({ ...j })}
              type="button"
            >
              <div>{j.date}</div>
              <div>{j.time}</div>
              <div className="ellipsis">{j.customerName}</div>
              <div>${money((Number(j.charge || 0) * (1 + NJ_TAX)))}</div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function CalendarPage({ jobs, customers, onCreateAt }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const times = useMemo(() => {
    const out = [];
    for (let h = 7; h <= 18; h++) { // 7 AM to 6 PM
      out.push({ h, m: 0 });
      out.push({ h, m: 30 });
    }
    return out;
  }, []);

  const jobsBySlot = useMemo(() => {
    const map = new Map();
    for (const j of jobs) {
      const key = `${j.date}__${j.time}`;
      map.set(key, j);
    }
    return map;
  }, [jobs]);

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="h1">Calendar</div>
          <div className="muted">Click a time slot to schedule a job (it will open the Customers ticket).</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setAnchor(addDays(anchor, -7))}>← Prev</button>
          <button className="btn" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="btn" onClick={() => setAnchor(addDays(anchor, 7))}>Next →</button>
        </div>
      </div>

      <div className="weekGrid">
        <div className="timeColHead">Time</div>
        {days.map(d => (
          <div key={ymd(d)} className="dayHead">
            <div className="dayName">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className="dayDate"><b>{formatDate(d)}</b></div>
          </div>
        ))}

        {times.map(t => (
          <React.Fragment key={`${t.h}:${t.m}`}>
            <div className="timeCell">{timeLabel(t.h, t.m)}</div>
            {days.map(d => {
              const dateStr = formatDate(d);
              const timeStr = timeLabel(t.h, t.m);
              const key = `${dateStr}__${timeStr}`;
              const j = jobsBySlot.get(key);

              return (
                <button
                  key={key}
                  className={"slot " + (j ? "hasJob" : "")}
                  onClick={() => onCreateAt(dateStr, timeStr)}
                  type="button"
                  title={j ? `${j.customerName} • ${j.address || ""}` : "Click to schedule"}
                >
                  {j ? (
                    <div className="jobChip">
                      <div className="jobTitle">{j.customerName}</div>
                      <div className="jobSub">{j.address ? j.address : "No address yet"}</div>
                      {j.address && (
                        <a
                          className="jobMap"
                          href={mapsLink(j.address)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Map
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="plus">+</span>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="mutedSmall" style={{ marginTop: 12 }}>
        Autofill works by typing a saved customer name. If it’s a new customer, just type everything manually and “Save Customer”.
      </div>
    </div>
  );
}
