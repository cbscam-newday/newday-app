import React, { useEffect, useMemo, useRef, useState } from "react";

const NJ_TAX = 0.06625;

const PESTS = [
  "Ants","Mice","Rats","Spiders","Roaches","Bed Bugs","Wasps","Bees","Hornets",
  "Yellow Jackets","Termites","Mosquitoes","Fleas/Ticks","Other"
];

const SERVICE_PLANS = ["One-time", "Monthly", "Quarterly", "Bi-Monthly", "Annual"];

const DEFAULT_CHEM_OPTIONS = [
  { name: "FirstStrike Soft Bait", epa: "12455-79" }, // example
  { name: "CB-80", epa: "499-362" }, // example
  { name: "Transport Mikron", epa: "2724-803" }, // example
];

function money(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return "";
  return x.toFixed(2);
}

function fmtDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const diff = (day === 0 ? -6 : 1 - day); // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMinutes(date, n) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + n);
  return d;
}

function timeLabel(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m} ${ampm}`;
}

function googleMapsLink(address) {
  if (!address?.trim()) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

function useLocalStorageState(key, initialValue) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}

function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // load existing signature
    if (!value) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = value;
  }, [value]);

  function getPos(e) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (c.width / rect.width);
    const y = (clientY - rect.top) * (c.height / rect.height);
    return { x, y };
  }

  function start(e) {
    const c = canvasRef.current;
    if (!c) return;
    drawing.current = true;
    last.current = getPos(e);
  }

  function move(e) {
    if (!drawing.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const p = getPos(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    e.preventDefault?.();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const c = canvasRef.current;
    if (!c) return;
    onChange?.(c.toDataURL("image/png"));
  }

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    onChange?.("");
  }

  return (
    <div className="sigBox">
      <div className="sigHeader">
        <div>
          <div className="h3">Customer Signature</div>
          <div className="muted">Sign with mouse/finger. Saves with the job.</div>
        </div>
        <button className="btn ghost" type="button" onClick={clear}>Clear</button>
      </div>

      <canvas
        ref={canvasRef}
        width={900}
        height={220}
        className="sigCanvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("Customers");
  const [customers, setCustomers] = useLocalStorageState("nd_customers", [
    // You can delete these examples later:
    { id: crypto.randomUUID(), name: "John Smith", phone: "201-555-1111", email: "john@email.com", address: "Fair Lawn, NJ" },
  ]);
  const [jobs, setJobs] = useLocalStorageState("nd_jobs", []);
  const [chemOptions, setChemOptions] = useLocalStorageState("nd_chems", DEFAULT_CHEM_OPTIONS);

  // Calendar (weekly) state
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);
  const timeSlots = useMemo(() => {
    const slots = [];
    const base = new Date(weekAnchor);
    base.setHours(8, 0, 0, 0); // 8:00 AM start
    for (let i = 0; i < 20; i++) { // 8:00 -> 18:00 in 30-min (20 slots = 10 hours)
      slots.push(addMinutes(base, i * 30));
    }
    return slots;
  }, [weekAnchor]);

  // Ticket form state (manual + autofill)
  const emptyTicket = {
    id: "",
    date: fmtDate(new Date()),
    time: "09:00",
    servicePlan: "One-time",
    charge: "",
    customerName: "",
    phone: "",
    email: "",
    address: "",
    pests: [],
    notes: "",
    chemicals: [
      { chemicalName: "", epa: "", amount: "", unit: "oz", mixRatio: "" }
    ],
    signature: "",
  };
  const [ticket, setTicket] = useState(emptyTicket);

  const subtotal = useMemo(() => {
    const v = Number(ticket.charge);
    return Number.isFinite(v) ? v : 0;
  }, [ticket.charge]);

  const tax = useMemo(() => subtotal * NJ_TAX, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const customerMatches = useMemo(() => {
    const q = (ticket.customerName || "").trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [ticket.customerName, customers]);

  function applyCustomer(c) {
    // Autofill, but still editable after fill
    setTicket(t => ({
      ...t,
      customerName: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
    }));
  }

  function pickSlot(dayDate, slotDate) {
    // Click a calendar slot → pre-fill ticket and jump to Customers page
    const dateStr = fmtDate(dayDate);
    const hh = String(slotDate.getHours()).padStart(2, "0");
    const mm = String(slotDate.getMinutes()).padStart(2, "0");
    setTicket(t => ({ ...emptyTicket, date: dateStr, time: `${hh}:${mm}` }));
    setPage("Customers");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveJob() {
    const id = ticket.id || crypto.randomUUID();
    const job = {
      ...ticket,
      id,
      subtotal: money(subtotal),
      tax: money(tax),
      total: money(total),
      createdAt: new Date().toISOString(),
    };
    setJobs(prev => {
      const exists = prev.find(j => j.id === id);
      if (exists) return prev.map(j => (j.id === id ? job : j));
      return [job, ...prev];
    });
    setTicket(t => ({ ...t, id }));
    alert("Saved job.");
  }

  function loadJob(job) {
    setTicket({
      id: job.id,
      date: job.date,
      time: job.time,
      servicePlan: job.servicePlan,
      charge: job.charge,
      customerName: job.customerName,
      phone: job.phone,
      email: job.email,
      address: job.address,
      pests: job.pests || [],
      notes: job.notes || "",
      chemicals: job.chemicals?.length ? job.chemicals : [{ chemicalName: "", epa: "", amount: "", unit: "oz", mixRatio: "" }],
      signature: job.signature || "",
    });
    setPage("Customers");
  }

  function clearTicket() {
    setTicket(emptyTicket);
  }

  function togglePest(p) {
    setTicket(t => {
      const has = t.pests.includes(p);
      return { ...t, pests: has ? t.pests.filter(x => x !== p) : [...t.pests, p] };
    });
  }

  function addChemicalRow() {
    setTicket(t => ({
      ...t,
      chemicals: [...t.chemicals, { chemicalName: "", epa: "", amount: "", unit: "oz", mixRatio: "" }],
    }));
  }

  function removeChemicalRow(idx) {
    setTicket(t => ({
      ...t,
      chemicals: t.chemicals.length <= 1 ? t.chemicals : t.chemicals.filter((_, i) => i !== idx),
    }));
  }

  function updateChemical(idx, patch) {
    setTicket(t => ({
      ...t,
      chemicals: t.chemicals.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }

  function selectChemical(idx, name) {
    const found = chemOptions.find(x => x.name === name);
    updateChemical(idx, { chemicalName: name, epa: found?.epa || "" });
  }

  function addChemicalToLibrary(name, epa) {
    const n = (name || "").trim();
    const e = (epa || "").trim();
    if (!n) return;
    setChemOptions(prev => {
      const exists = prev.some(x => x.name.toLowerCase() === n.toLowerCase());
      if (exists) return prev;
      return [...prev, { name: n, epa: e }];
    });
  }

  function emailReceipt() {
    // For now (frontend-only) we open the user's email app with a prefilled email.
    // Real email sending will require a backend/Netlify function later.
    const to = (ticket.email || "").trim();
    const subject = encodeURIComponent(`Receipt - New Day Pest Control - ${ticket.date} ${ticket.time}`);
    const lines = [
      `New Day Pest Control`,
      `(201) 972-5592`,
      `newdaypestcontrol@yahoo.com`,
      ``,
      `Customer: ${ticket.customerName}`,
      `Phone: ${ticket.phone}`,
      `Address: ${ticket.address}`,
      ``,
      `Service Plan: ${ticket.servicePlan}`,
      `Pest(s): ${(ticket.pests || []).join(", ")}`,
      ``,
      `Subtotal: $${money(subtotal)}`,
      `NJ Tax (6.625%): $${money(tax)}`,
      `Total: $${money(total)}`,
      ``,
      `Notes: ${ticket.notes || ""}`,
    ];
    const body = encodeURIComponent(lines.join("\n"));
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  }

  // ---- UI blocks ----
  const Header = (
    <div className="topbar">
      <div className="brand">
        <div className="logo">ND</div>
        <div className="brandText">
          <div className="brandName">New Day Pest Control</div>
          <div className="brandSub">(201) 972-5592 • newdaypestcontrol@yahoo.com</div>
        </div>
      </div>

      <div className="topRight">
        <div className="pill">NJ Tax: <b>6.625%</b></div>
        <div className="pageTitle">{page}</div>
      </div>
    </div>
  );

  const Sidebar = (
    <div className="sidebar">
      <div className="menuTitle">MENU</div>
      {["Customers", "Calendar", "Jobs", "Materials", "Contracts", "Receipts"].map(item => (
        <button
          key={item}
          className={`navItem ${page === item ? "active" : ""}`}
          onClick={() => setPage(item)}
          type="button"
        >
          {item}
        </button>
      ))}
      <div className="status">
        <div className="statusLabel">Status</div>
        <div className="muted">Local save: <b>ON</b> (browser)</div>
      </div>
    </div>
  );

  const SavedJobs = (
    <div className="card">
      <div className="cardHead">
        <div>
          <div className="h2">Saved Jobs</div>
          <div className="muted">Click a row to load it back into the form.</div>
        </div>
        <div className="pill">{jobs.length} saved</div>
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Pest</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">No saved jobs yet. Click a Calendar slot or fill the ticket and Save.</td>
              </tr>
            ) : (
              jobs.map(j => (
                <tr key={j.id} className="row" onClick={() => loadJob(j)}>
                  <td><b>{j.date}</b></td>
                  <td>{j.time}</td>
                  <td>{j.customerName}</td>
                  <td>{(j.pests || []).join(", ")}</td>
                  <td className="right"><b>${money(Number(j.total ?? 0)) || j.total}</b></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CustomersPage = (
    <div className="grid2">
      <div className="card">
        <div className="cardHead">
          <div>
            <div className="h2">Service Ticket</div>
            <div className="muted">Autofill by typing a saved name, OR just type manually for a new customer.</div>
          </div>
          <div className="actions">
            <button className="btn" onClick={saveJob} type="button">Save</button>
            <button className="btn ghost" onClick={clearTicket} type="button">Clear</button>
          </div>
        </div>

        {/* Date / time / plan / charge */}
        <div className="formRow3">
          <div>
            <label>Date <span className="muted">(bold)</span></label>
            <input
              type="date"
              value={ticket.date}
              onChange={e => setTicket(t => ({ ...t, date: e.target.value }))}
              className="input dateBold"
            />
          </div>
          <div>
            <label>Time</label>
            <input
              value={ticket.time}
              onChange={e => setTicket(t => ({ ...t, time: e.target.value }))}
              className="input"
              placeholder="e.g. 09:30"
            />
          </div>
          <div>
            <label>Service Plan</label>
            <select
              className="input"
              value={ticket.servicePlan}
              onChange={e => setTicket(t => ({ ...t, servicePlan: e.target.value }))}
            >
              {SERVICE_PLANS.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label>Charge (subtotal)</label>
            <input
              className="input"
              value={ticket.charge}
              onChange={e => setTicket(t => ({ ...t, charge: e.target.value }))}
              placeholder="e.g. 149.00"
            />
          </div>
        </div>

        {/* Customer */}
        <div className="formRow2">
          <div style={{ position: "relative" }}>
            <label>Customer Name <span className="muted">(autofill or manual)</span></label>
            <input
              className="input"
              value={ticket.customerName}
              onChange={e => setTicket(t => ({ ...t, customerName: e.target.value }))}
              placeholder="Start typing a saved customer OR type a new one"
            />
            {customerMatches.length > 0 && (
              <div className="typeahead">
                {customerMatches.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="typeaheadItem"
                    onClick={() => applyCustomer(c)}
                  >
                    <b>{c.name}</b>
                    <span className="muted">{c.phone} • {c.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label>Phone</label>
            <input
              className="input"
              value={ticket.phone}
              onChange={e => setTicket(t => ({ ...t, phone: e.target.value }))}
              placeholder="(###) ###-####"
            />
          </div>
        </div>

        <div className="formRow2">
          <div>
            <label>Email</label>
            <input
              className="input"
              value={ticket.email}
              onChange={e => setTicket(t => ({ ...t, email: e.target.value }))}
              placeholder="customer@email.com"
            />
          </div>
          <div>
            <label>Address <span className="muted">(click Maps)</span></label>
            <div className="inputWithBtn">
              <input
                className="input"
                value={ticket.address}
                onChange={e => setTicket(t => ({ ...t, address: e.target.value }))}
                placeholder="Street, City, NJ ZIP"
              />
              <a
                className={`btn ghost small ${ticket.address?.trim() ? "" : "disabled"}`}
                href={googleMapsLink(ticket.address)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { if (!ticket.address?.trim()) e.preventDefault(); }}
              >
                Maps
              </a>
            </div>
          </div>
        </div>

        {/* Pest */}
        <div className="cardSub">
          <div className="h3">Service Type (Pest)</div>
          <div className="muted">Select all that apply</div>
          <div className="pillGrid">
            {PESTS.map(p => (
              <button
                key={p}
                type="button"
                className={`pillBtn ${ticket.pests.includes(p) ? "on" : ""}`}
                onClick={() => togglePest(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chemicals */}
        <div className="cardSub">
          <div className="chemHead">
            <div>
              <div className="h3">Chemicals Used</div>
              <div className="muted">Multiple chemicals per job • amount used • unit • mix ratio • editable</div>
            </div>
            <button className="btn ghost" type="button" onClick={addChemicalRow}>+ Add Chemical</button>
          </div>

          {ticket.chemicals.map((c, idx) => (
            <div key={idx} className="chemRow">
              <div>
                <label>Chemical</label>
                <select
                  className="input"
                  value={c.chemicalName}
                  onChange={e => selectChemical(idx, e.target.value)}
                >
                  <option value="">Select…</option>
                  {chemOptions.map(x => (
                    <option key={x.name} value={x.name}>{x.name}{x.epa ? ` (EPA ${x.epa})` : ""}</option>
                  ))}
                </select>
                <div className="muted tiny">Or type: <input
                  className="inlineInput"
                  value={c.chemicalName}
                  onChange={e => updateChemical(idx, { chemicalName: e.target.value })}
                  placeholder="Type chemical name"
                /></div>
              </div>

              <div>
                <label>EPA #</label>
                <input
                  className="input"
                  value={c.epa}
                  onChange={e => updateChemical(idx, { epa: e.target.value })}
                  placeholder="EPA number"
                />
              </div>

              <div>
                <label>Amount Used</label>
                <input
                  className="input"
                  value={c.amount}
                  onChange={e => updateChemical(idx, { amount: e.target.value })}
                  placeholder="e.g. 2.5"
                />
              </div>

              <div>
                <label>Unit</label>
                <select
                  className="input"
                  value={c.unit}
                  onChange={e => updateChemical(idx, { unit: e.target.value })}
                >
                  <option value="oz">oz</option>
                  <option value="gal">gal</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </select>
              </div>

              <div>
                <label>Mix Ratio</label>
                <input
                  className="input"
                  value={c.mixRatio}
                  onChange={e => updateChemical(idx, { mixRatio: e.target.value })}
                  placeholder='e.g. "1 oz / 1 gal"'
                />
              </div>

              <div className="chemRemove">
                <button className="btn ghost" type="button" onClick={() => removeChemicalRow(idx)}>✕</button>
              </div>
            </div>
          ))}

          <div className="chemAddLib">
            <div className="muted"><b>Add to chemical library</b> (so it shows in the dropdown)</div>
            <ChemLibraryAdder onAdd={addChemicalToLibrary} />
          </div>
        </div>

        {/* Notes */}
        <div className="cardSub">
          <div className="h3">Notes</div>
          <textarea
            className="textarea"
            value={ticket.notes}
            onChange={e => setTicket(t => ({ ...t, notes: e.target.value }))}
            placeholder="Type job notes here..."
          />
        </div>

        {/* Signature */}
        <SignaturePad
          value={ticket.signature}
          onChange={(sig) => setTicket(t => ({ ...t, signature: sig }))}
        />

        {/* Totals + receipt */}
        <div className="totals">
          <div className="totRow"><span>Subtotal</span><b>${money(subtotal)}</b></div>
          <div className="totRow"><span>NJ Tax (6.625%)</span><b>${money(tax)}</b></div>
          <div className="totRow big"><span>Total</span><b>${money(total)}</b></div>

          <div className="receiptActions">
            <button className="btn ghost" type="button" onClick={emailReceipt}>Email receipt</button>
          </div>

          <div className="muted tiny">
            Note: “Email receipt” currently opens your email app (mailto). Real sending from the app requires a backend next.
          </div>
        </div>
      </div>

      {SavedJobs}
    </div>
  );

  const CalendarPage = (
    <div className="grid2">
      <div className="card">
        <div className="cardHead">
          <div>
            <div className="h2">Calendar (Weekly)</div>
            <div className="muted">Click a time slot to create a job. We’ll fill Date/Time automatically.</div>
          </div>
          <div className="actions">
            <button className="btn ghost" type="button" onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}>← Prev</button>
            <button className="btn ghost" type="button" onClick={() => setWeekAnchor(startOfWeek(new Date()))}>Today</button>
            <button className="btn ghost" type="button" onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}>Next →</button>
          </div>
        </div>

        <div className="calGrid">
          <div className="calHeader timeCol">Time</div>
          {weekDays.map((d) => (
            <div key={fmtDate(d)} className="calHeader dayCol">
              <div className="dow">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              <div className="dateBoldText">{d.toLocaleDateString()}</div>
            </div>
          ))}

          {timeSlots.map((t, rIdx) => (
            <React.Fragment key={rIdx}>
              <div className="timeCell">{timeLabel(t)}</div>
              {weekDays.map((day) => {
                const slot = new Date(day);
                slot.setHours(t.getHours(), t.getMinutes(), 0, 0);
                const slotKey = `${fmtDate(day)} ${String(slot.getHours()).padStart(2, "0")}:${String(slot.getMinutes()).padStart(2, "0")}`;
                const jobHere = jobs.find(j => `${j.date} ${j.time}` === slotKey);

                return (
                  <button
                    key={slotKey}
                    className={`slot ${jobHere ? "booked" : ""}`}
                    type="button"
                    onClick={() => pickSlot(day, slot)}
                    title={jobHere ? `${jobHere.customerName} (${jobHere.time})` : "Click to schedule"}
                  >
                    {jobHere ? (
                      <div className="slotInner">
                        <div className="slotName">{jobHere.customerName || "Booked"}</div>
                        <div className="slotSmall">{(jobHere.pests || []).join(", ")}</div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {SavedJobs}
    </div>
  );

  const Placeholder = (title) => (
    <div className="card">
      <div className="cardHead">
        <div>
          <div className="h2">{title}</div>
          <div className="muted">This section is next. For now, Calendar + Customers/Service Ticket are working.</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      {Header}
      <div className="layout">
        {Sidebar}
        <div className="content">
          {page === "Customers" && CustomersPage}
          {page === "Calendar" && CalendarPage}
          {page === "Jobs" && Placeholder("Jobs")}
          {page === "Materials" && Placeholder("Materials")}
          {page === "Contracts" && Placeholder("Contracts")}
          {page === "Receipts" && Placeholder("Receipts")}
        </div>
      </div>
    </div>
  );
}

function ChemLibraryAdder({ onAdd }) {
  const [name, setName] = useState("");
  const [epa, setEpa] = useState("");

  return (
    <div className="chemAddRow">
      <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Chemical name" />
      <input className="input" value={epa} onChange={e => setEpa(e.target.value)} placeholder="EPA #" />
      <button
        className="btn"
        type="button"
        onClick={() => {
          onAdd?.(name, epa);
          setName("");
          setEpa("");
        }}
      >
        Add
      </button>
    </div>
  );
}
