import React, { useEffect, useMemo, useRef, useState } from "react";

const NJ_TAX_RATE = 0.06625;

const SERVICE_TYPES = ["One-time", "Monthly", "Quarterly"];

const PEST_TYPES = [
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

const DEFAULT_CHEMICAL_LIBRARY = [
  { name: "FirstStrike Soft Bait", epa: "7173-258" },
  { name: "CB-80 (Aerosol)", epa: "279-3393" },
  { name: "Transport Mikron", epa: "8033-109-279" },
  { name: "Alpine WSG", epa: "499-561" },
  { name: "Termidor SC", epa: "7969-210" },
  { name: "Advion Cockroach Gel Bait", epa: "100-1484" },
  { name: "Suspend SC", epa: "432-763" },
  { name: "Gentrol IGR Concentrate", epa: "2724-351" },
  { name: "Tekko Pro IGR", epa: "53883-335" },
  { name: "Phantom Termiticide/Insecticide", epa: "241-392" },
  { name: "Demand CS", epa: "100-1066" },
];

function money(n) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateObj, days) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(dateObj) {
  const d = new Date(dateObj);
  // Week starts Monday
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimeLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function googleMapsLink(address) {
  const a = (address || "").trim();
  if (!a) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}

function buildReceiptText(job) {
  const lines = [];
  lines.push("New Day Pest Control");
  lines.push("(201) 972-5592 • newdaypestcontrol@yahoo.com");
  lines.push("--------------------------------------------------");
  lines.push(`Date: ${job.date}`);
  if (job.time) lines.push(`Time: ${job.time}`);
  lines.push(`Customer: ${job.customerName}`);
  lines.push(`Address: ${job.address}`);
  lines.push(`Phone: ${job.phone}`);
  lines.push(`Email: ${job.email}`);
  lines.push("");
  lines.push(`Service Plan: ${job.serviceType}`);
  lines.push(`Pest Type(s): ${job.pestTypes.join(", ") || "—"}`);
  lines.push("");
  lines.push("Chemicals Used:");
  if (!job.chemicals.length) {
    lines.push("  —");
  } else {
    job.chemicals.forEach((c, idx) => {
      const epaPart = c.epa ? ` (EPA ${c.epa})` : "";
      lines.push(
        `  ${idx + 1}. ${c.name}${epaPart} | Amount: ${c.amountUsed} ${c.amountUnit} | Mix ratio: ${c.mixRatio}`
      );
    });
  }
  lines.push("");
  lines.push("Notes:");
  lines.push(job.notes || "—");
  lines.push("");
  lines.push(`Subtotal: ${money(job.subtotal)}`);
  lines.push(`NJ Tax (6.625%): ${money(job.tax)}`);
  lines.push(`Total: ${money(job.total)}`);
  lines.push("");
  lines.push("Thank you for your business!");
  return lines.join("\n");
}

function MailtoReceiptButton({ job }) {
  const subject = encodeURIComponent(`Receipt - New Day Pest Control - ${job.date}${job.time ? " " + job.time : ""}`);
  const body = encodeURIComponent(buildReceiptText(job));
  const to = (job.email || "").trim();
  const href = `mailto:${to}?subject=${subject}&body=${body}`;

  return (
    <a
      href={href}
      style={btnPrimary}
      onClick={(e) => {
        if (!to) {
          e.preventDefault();
          alert("Add the customer email first, then click Email Receipt.");
        }
      }}
      title={to ? "Open your email app with a pre-filled receipt" : "Add an email first"}
    >
      Email Receipt
    </a>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return <input {...props} style={{ ...inputBase, ...(props.style || {}) }} />;
}
function Select(props) {
  return <select {...props} style={{ ...inputBase, ...(props.style || {}) }} />;
}
function Textarea(props) {
  return <textarea {...props} style={{ ...textareaBase, ...(props.style || {}) }} />;
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(15, 122, 42, 0.10)",
        border: "1px solid rgba(15, 122, 42, 0.25)",
        color: "#0f7a2a",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Modal({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div style={modalBackdrop} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={modalHead}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
            {subtitle ? <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{subtitle}</div> : null}
          </div>
          <button style={iconBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
        {footer ? <div style={modalFooter}>{footer}</div> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("customers");

  // Customers “database”
  const [customers, setCustomers] = useState([]);

  // Jobs database
  const [jobs, setJobs] = useState([]);

  // Chemicals library (editable later; for now fixed list + manual typing)
  const [chemLibrary] = useState(DEFAULT_CHEMICAL_LIBRARY);

  // Calendar state
  const [calendarMode, setCalendarMode] = useState("week"); // "week" | "day"
  const [calendarFocus, setCalendarFocus] = useState(new Date());
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotISODate, setSlotISODate] = useState(todayISO());
  const [slotTime, setSlotTime] = useState("09:00 AM");

  // Ticket form (also used by calendar modal)
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(""); // optional for non-scheduled jobs

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [serviceType, setServiceType] = useState("One-time");
  const [pestTypes, setPestTypes] = useState([]);

  const [chemicals, setChemicals] = useState([
    { name: "", epa: "", amountUsed: "", amountUnit: "oz", mixRatio: "" },
  ]);

  const [notes, setNotes] = useState("");
  const [subtotalRaw, setSubtotalRaw] = useState("");

  // Auto-fill: when customerName matches a saved customer, fill fields
  const lastAutoFillRef = useRef("");
  useEffect(() => {
    const typed = (customerName || "").trim();
    if (!typed) return;

    // prevent infinite loops if user is editing after autofill
    if (lastAutoFillRef.current === typed) return;

    const found = customers.find((c) => c.name.toLowerCase() === typed.toLowerCase());
    if (found) {
      setAddress(found.address || "");
      setPhone(found.phone || "");
      setEmail(found.email || "");
      setServiceType(found.plan || "One-time");
      lastAutoFillRef.current = found.name;
    }
  }, [customerName, customers]);

  const subtotal = useMemo(() => {
    const n = Number(String(subtotalRaw).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [subtotalRaw]);

  const tax = useMemo(() => subtotal * NJ_TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  useEffect(() => {
    // Load local storage
    const c = localStorage.getItem("nd_customers_v1");
    const j = localStorage.getItem("nd_jobs_v2");
    if (c) {
      try {
        setCustomers(JSON.parse(c));
      } catch {}
    }
    if (j) {
      try {
        setJobs(JSON.parse(j));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("nd_customers_v1", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem("nd_jobs_v2", JSON.stringify(jobs));
  }, [jobs]);

  const currentJob = useMemo(() => {
    const cleanedChems = chemicals
      .map((c) => ({
        name: (c.name || "").trim(),
        epa: (c.epa || "").trim(),
        amountUsed: (c.amountUsed || "").trim(),
        amountUnit: (c.amountUnit || "oz").trim(),
        mixRatio: (c.mixRatio || "").trim(),
      }))
      .filter((c) => c.name || c.amountUsed || c.mixRatio);

    return {
      id: crypto?.randomUUID?.() || String(Date.now()),
      date,
      time,
      customerName,
      address,
      phone,
      email,
      serviceType,
      pestTypes,
      chemicals: cleanedChems,
      notes,
      subtotal,
      tax,
      total,
      // Calendar fields:
      scheduledAt: time ? `${date} ${time}` : "",
    };
  }, [
    date,
    time,
    customerName,
    address,
    phone,
    email,
    serviceType,
    pestTypes,
    chemicals,
    notes,
    subtotal,
    tax,
    total,
  ]);

  function togglePest(pest) {
    setPestTypes((prev) => (prev.includes(pest) ? prev.filter((p) => p !== pest) : [...prev, pest]));
  }

  function addChemicalRow() {
    setChemicals((prev) => [
      ...prev,
      { name: "", epa: "", amountUsed: "", amountUnit: "oz", mixRatio: "" },
    ]);
  }

  function updateChemical(idx, patch) {
    setChemicals((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeChemical(idx) {
    setChemicals((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ name: "", epa: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }];
    });
  }

  function resetForm() {
    setDate(todayISO());
    setTime("");
    setCustomerName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setServiceType("One-time");
    setPestTypes([]);
    setChemicals([{ name: "", epa: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]);
    setNotes("");
    setSubtotalRaw("");
    lastAutoFillRef.current = "";
  }

  function saveCustomerFromForm() {
    const name = (customerName || "").trim();
    if (!name) return alert("Customer name is required to save.");
    const newCustomer = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      name,
      address: (address || "").trim(),
      phone: (phone || "").trim(),
      email: (email || "").trim(),
      plan: serviceType,
      updatedAt: Date.now(),
    };
    setCustomers((prev) => {
      const existingIndex = prev.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = { ...copy[existingIndex], ...newCustomer, id: copy[existingIndex].id };
        return copy;
      }
      return [newCustomer, ...prev];
    });
    alert("Customer saved ✅");
  }

  function saveJob({ alsoSaveCustomer } = { alsoSaveCustomer: true }) {
    if (!customerName.trim()) return alert("Customer name is required.");
    if (!address.trim()) return alert("Address is required.");
    if (!phone.trim()) return alert("Phone is required.");

    if (alsoSaveCustomer) saveCustomerFromForm();

    setJobs((prev) => [{ ...currentJob }, ...prev]);
    alert("Job saved ✅");
  }

  function removeJob(id) {
    if (!confirm("Delete this job?")) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function loadJob(job) {
    setActive("customers");
    setDate(job.date || todayISO());
    setTime(job.time || "");
    setCustomerName(job.customerName || "");
    setAddress(job.address || "");
    setPhone(job.phone || "");
    setEmail(job.email || "");
    setServiceType(job.serviceType || "One-time");
    setPestTypes(Array.isArray(job.pestTypes) ? job.pestTypes : []);
    setChemicals(
      Array.isArray(job.chemicals) && job.chemicals.length
        ? job.chemicals.map((c) => ({
            name: c.name || "",
            epa: c.epa || "",
            amountUsed: c.amountUsed || "",
            amountUnit: c.amountUnit || "oz",
            mixRatio: c.mixRatio || "",
          }))
        : [{ name: "", epa: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]
    );
    setNotes(job.notes || "");
    setSubtotalRaw(String(job.subtotal ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Calendar: show week/day grid 8:00–18:00 in 30-min increments
  const dayStartMin = 8 * 60;
  const dayEndMin = 18 * 60;
  const slotStep = 30;

  const weekStart = useMemo(() => startOfWeek(calendarFocus), [calendarFocus]);
  const weekDays = useMemo(() => [...Array(7)].map((_, i) => addDays(weekStart, i)), [weekStart]);

  function openSlot(d, minutes) {
    setSlotISODate(toISODate(d));
    setSlotTime(formatTimeLabel(minutes));
    setSlotModalOpen(true);

    // preload date/time into form
    setDate(toISODate(d));
    setTime(formatTimeLabel(minutes));
  }

  // simple scheduled lookup
  const scheduledByKey = useMemo(() => {
    const map = new Map();
    jobs.forEach((j) => {
      if (!j.date || !j.time) return;
      const key = `${j.date}__${j.time}`;
      const arr = map.get(key) || [];
      arr.push(j);
      map.set(key, arr);
    });
    return map;
  }, [jobs]);

  const pageTitle = useMemo(() => {
    if (active === "customers") return "Customers / Service Ticket";
    if (active === "calendar") return "Calendar";
    if (active === "materials") return "Materials";
    if (active === "contracts") return "Contracts";
    if (active === "receipts") return "Receipts";
    return "Jobs";
  }, [active]);

  return (
    <div style={appRoot}>
      {/* Top bar */}
      <div style={topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={brandMark}>ND</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>New Day Pest Control</div>
            <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 800 }}>
              (201) 972-5592 • newdaypestcontrol@yahoo.com
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill>NJ Tax: 6.625%</Pill>
          <div style={{ height: 36, width: 1, background: "rgba(0,0,0,0.10)" }} />
          <div style={{ fontWeight: 950, color: "#0f7a2a" }}>{pageTitle}</div>
        </div>
      </div>

      {/* Layout */}
      <div style={layout}>
        {/* Sidebar */}
        <div style={sidebar}>
          <div style={sidebarHead}>MENU</div>

          {[
            { id: "customers", label: "Customers" },
            { id: "calendar", label: "Calendar" },
            { id: "jobs", label: "Jobs" },
            { id: "materials", label: "Materials" },
            { id: "contracts", label: "Contracts" },
            { id: "receipts", label: "Receipts" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                ...navBtn,
                background: active === item.id ? "rgba(15, 122, 42, 0.10)" : "transparent",
                color: active === item.id ? "#0f7a2a" : "#111827",
                borderLeft: active === item.id ? "4px solid #0f7a2a" : "4px solid transparent",
              }}
            >
              {item.label}
            </button>
          ))}

          <div style={sidebarFooter}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>Autofill</div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#6b7280", fontWeight: 800 }}>
              Type/select a saved customer name to auto-fill address/phone/email.
            </div>
          </div>
        </div>

        {/* Main area */}
        <div style={mainGrid}>
          {/* Left panel */}
          <div style={card}>
            {active === "customers" && (
              <>
                <div style={cardHead}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Service Ticket</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Autofill or manually enter info • save job • receipt • email
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={btnPrimary} onClick={() => saveJob({ alsoSaveCustomer: true })}>
                      Save Job
                    </button>
                    <button style={btnOutline} onClick={saveCustomerFromForm}>
                      Save Customer
                    </button>
                    <button style={btnOutline} onClick={resetForm}>
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Date (bold)">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ fontWeight: 900 }}
                    />
                  </Field>

                  <Field label="Time">
                    <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 9:30 AM" />
                  </Field>

                  <Field label="Charge (subtotal)">
                    <Input
                      value={subtotalRaw}
                      onChange={(e) => setSubtotalRaw(e.target.value)}
                      placeholder="e.g. 149.00"
                      inputMode="decimal"
                    />
                  </Field>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                  <Field label="Customer Name (autofill)">
                    <>
                      <Input
                        list="customerList"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Start typing a saved customer… or enter a new name"
                      />
                      <datalist id="customerList">
                        {customers.map((c) => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
                    </>
                  </Field>

                  <Field label="Phone">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(###) ###-####" />
                  </Field>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Address">
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, City, NJ ZIP"
                      />
                      <div style={{ marginTop: 6 }}>
                        {address.trim() ? (
                          <a
                            href={googleMapsLink(address)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, fontWeight: 900, color: "#0f7a2a", textDecoration: "none" }}
                          >
                            Open in Google Maps →
                          </a>
                        ) : (
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280" }}>
                            Add address to enable Google Maps link
                          </div>
                        )}
                      </div>
                    </Field>
                  </div>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Email">
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" />
                    </Field>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Service Plan">
                    <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                      {SERVICE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Totals">
                    <div style={totalsBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
                        <span>Subtotal</span>
                        <span>{money(subtotal)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
                        <span>NJ Tax (6.625%)</span>
                        <span>{money(tax)}</span>
                      </div>
                      <div style={{ height: 1, background: "rgba(0,0,0,0.10)", margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 950, color: "#0f7a2a" }}>
                        <span>Total</span>
                        <span>{money(total)}</span>
                      </div>
                    </div>
                  </Field>
                </div>

                <div style={{ height: 12 }} />

                {/* Pests */}
                <div style={sectionBox}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: 950 }}>Pest Type</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Select all that apply</div>
                  </div>
                  <div style={{ height: 10 }} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PEST_TYPES.map((p) => {
                      const on = pestTypes.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => togglePest(p)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 999,
                            border: on ? "1px solid rgba(15, 122, 42, 0.55)" : "1px solid rgba(0,0,0,0.12)",
                            background: on ? "rgba(15, 122, 42, 0.12)" : "white",
                            color: on ? "#0f7a2a" : "#111827",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 12 }} />

                {/* Chemicals */}
                <div style={sectionBox}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>Chemicals Used (EPA #)</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        Pick from list or type manually • add amount + mix ratio
                      </div>
                    </div>
                    <button style={btnOutline} onClick={addChemicalRow}>
                      + Add Chemical
                    </button>
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={{ display: "grid", gap: 10 }}>
                    {chemicals.map((c, idx) => (
                      <div key={idx} style={chemRow}>
                        <Field label="Chemical (pick or type)">
                          <>
                            <Select
                              value={c.name}
                              onChange={(e) => {
                                const picked = chemLibrary.find((x) => x.name === e.target.value);
                                updateChemical(idx, { name: e.target.value, epa: picked?.epa || "" });
                              }}
                            >
                              <option value="">Select…</option>
                              {chemLibrary.map((x) => (
                                <option key={x.name} value={x.name}>
                                  {x.name} {x.epa ? `(EPA ${x.epa})` : ""}
                                </option>
                              ))}
                            </Select>
                            <div style={{ height: 6 }} />
                            <Input
                              value={c.name}
                              onChange={(e) => updateChemical(idx, { name: e.target.value })}
                              placeholder="Or type a chemical name"
                            />
                          </>
                        </Field>

                        <Field label="EPA # (editable)">
                          <Input value={c.epa} onChange={(e) => updateChemical(idx, { epa: e.target.value })} placeholder="EPA Reg No." />
                        </Field>

                        <Field label="Amount">
                          <Input value={c.amountUsed} onChange={(e) => updateChemical(idx, { amountUsed: e.target.value })} placeholder="e.g. 2.5" />
                        </Field>

                        <Field label="Unit">
                          <Select value={c.amountUnit} onChange={(e) => updateChemical(idx, { amountUnit: e.target.value })}>
                            <option value="oz">oz</option>
                            <option value="ml">ml</option>
                            <option value="gal">gal</option>
                            <option value="qt">qt</option>
                            <option value="lb">lb</option>
                            <option value="g">g</option>
                          </Select>
                        </Field>

                        <Field label="Mix Ratio">
                          <Input value={c.mixRatio} onChange={(e) => updateChemical(idx, { mixRatio: e.target.value })} placeholder='e.g. "1 oz / 1 gal"' />
                        </Field>

                        <button style={iconBtn} onClick={() => removeChemical(idx)} title="Remove">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                  <Field label="Notes">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about the job, areas treated, findings, etc." />
                  </Field>

                  <div style={{ ...sectionBox, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontWeight: 950 }}>Receipt</div>
                    <MailtoReceiptButton job={currentJob} />
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      This opens your email app with the receipt filled in.
                    </div>
                  </div>
                </div>
              </>
            )}

            {active === "calendar" && (
              <>
                <div style={cardHead}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Calendar</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Click any date/time slot to schedule a future job.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button style={btnOutline} onClick={() => setCalendarFocus(addDays(calendarFocus, -7))}>
                      ◀ Prev
                    </button>
                    <button style={btnOutline} onClick={() => setCalendarFocus(new Date())}>
                      Today
                    </button>
                    <button style={btnOutline} onClick={() => setCalendarFocus(addDays(calendarFocus, 7))}>
                      Next ▶
                    </button>
                    <Select value={calendarMode} onChange={(e) => setCalendarMode(e.target.value)} style={{ width: 120 }}>
                      <option value="week">Week</option>
                      <option value="day">Day</option>
                    </Select>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                {calendarMode === "week" ? (
                  <div style={calendarGridWrap}>
                    <div style={calendarHeaderRow}>
                      <div style={{ width: 80 }} />
                      {weekDays.map((d) => {
                        const iso = toISODate(d);
                        return (
                          <div key={iso} style={calendarHeaderCell}>
                            <div style={{ fontWeight: 950 }}>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                            <div style={{ fontWeight: 900, color: "#0f7a2a" }}>{iso}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={calendarBody}>
                      {/* time column */}
                      <div style={{ width: 80 }}>
                        {Array.from({ length: (dayEndMin - dayStartMin) / slotStep + 1 }, (_, i) => dayStartMin + i * slotStep).map(
                          (min) => (
                            <div key={min} style={timeCell}>
                              {formatTimeLabel(min)}
                            </div>
                          )
                        )}
                      </div>

                      {/* day columns */}
                      {weekDays.map((d) => {
                        const isoDate = toISODate(d);
                        return (
                          <div key={isoDate} style={dayCol}>
                            {Array.from({ length: (dayEndMin - dayStartMin) / slotStep }, (_, i) => dayStartMin + i * slotStep).map(
                              (min) => {
                                const t = formatTimeLabel(min);
                                const key = `${isoDate}__${t}`;
                                const scheduled = scheduledByKey.get(key) || [];
                                return (
                                  <div key={key} style={slotCell} onClick={() => openSlot(d, min)}>
                                    {scheduled.slice(0, 2).map((j) => (
                                      <div key={j.id} style={scheduledChip}>
                                        <div style={{ fontWeight: 950 }}>{j.customerName}</div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: "#065f46" }}>
                                          {(j.pestTypes || []).slice(0, 2).join(", ") || j.serviceType}
                                        </div>
                                      </div>
                                    ))}
                                    {scheduled.length > 2 ? (
                                      <div style={{ fontSize: 11, fontWeight: 900, color: "#0f7a2a" }}>
                                        +{scheduled.length - 2} more
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Day view
                  <div style={calendarGridWrap}>
                    <div style={cardMiniHead}>
                      <div style={{ fontWeight: 950 }}>
                        {calendarFocus.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div style={{ fontWeight: 900, color: "#0f7a2a" }}>{toISODate(calendarFocus)}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr" }}>
                      <div>
                        {Array.from({ length: (dayEndMin - dayStartMin) / slotStep + 1 }, (_, i) => dayStartMin + i * slotStep).map(
                          (min) => (
                            <div key={min} style={timeCell}>
                              {formatTimeLabel(min)}
                            </div>
                          )
                        )}
                      </div>

                      <div>
                        {Array.from({ length: (dayEndMin - dayStartMin) / slotStep }, (_, i) => dayStartMin + i * slotStep).map(
                          (min) => {
                            const isoDate = toISODate(calendarFocus);
                            const t = formatTimeLabel(min);
                            const key = `${isoDate}__${t}`;
                            const scheduled = scheduledByKey.get(key) || [];
                            return (
                              <div key={key} style={slotCell} onClick={() => openSlot(calendarFocus, min)}>
                                {scheduled.map((j) => (
                                  <div key={j.id} style={scheduledChip}>
                                    <div style={{ fontWeight: 950 }}>{j.customerName}</div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "#065f46" }}>
                                      {(j.pestTypes || []).join(", ") || j.serviceType}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {active === "jobs" && (
              <div style={{ padding: 10, color: "#6b7280", fontWeight: 800 }}>
                Use the right panel “Saved Jobs” list. Click one to load it back into the Service Ticket.
              </div>
            )}

            {active === "materials" && (
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 950 }}>Materials / Chemicals Library</div>
                <div style={{ marginTop: 8, color: "#6b7280", fontWeight: 800 }}>
                  Right now the chemical list is built into the job form. Next step is a full editable Materials page.
                </div>
              </div>
            )}

            {active === "contracts" && (
              <div style={{ padding: 10, color: "#6b7280", fontWeight: 800 }}>
                Contracts page is next (monthly/quarterly plans, renewals, etc.)
              </div>
            )}

            {active === "receipts" && (
              <div style={{ padding: 10, color: "#6b7280", fontWeight: 800 }}>
                Receipts are generated from a job. Use “Email Receipt” inside the ticket.
              </div>
            )}
          </div>

          {/* Right panel: Saved jobs + Customers */}
          <div style={rightCol}>
            <div style={card}>
              <div style={cardHead}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>Saved Jobs</div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                    Click a row to load it. (Drag/drop scheduling comes next.)
                  </div>
                </div>
                <Pill>{jobs.length} saved</Pill>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr style={{ background: "rgba(15, 122, 42, 0.10)" }}>
                      <th style={th}>Date</th>
                      <th style={th}>Time</th>
                      <th style={th}>Customer</th>
                      <th style={th}>Total</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={emptyRow}>
                          No saved jobs yet. Schedule one in Calendar or fill the ticket and save.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((j) => (
                        <tr key={j.id} style={tr} onClick={() => loadJob(j)}>
                          <td style={td}>{j.date}</td>
                          <td style={td}>{j.time || "—"}</td>
                          <td style={td}>
                            <div style={{ fontWeight: 950 }}>{j.customerName}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                              {(j.pestTypes || []).slice(0, 2).join(", ") || j.serviceType}
                            </div>
                          </td>
                          <td style={td}>{money(j.total)}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <button
                              style={btnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeJob(j.id);
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={card}>
              <div style={cardHead}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>Customers</div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                    Saved customers auto-fill the ticket when you type/select the name.
                  </div>
                </div>
                <Pill>{customers.length} customers</Pill>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {customers.slice(0, 8).map((c) => (
                  <div key={c.id} style={miniRow} onClick={() => setCustomerName(c.name)}>
                    <div style={{ fontWeight: 950 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      {c.phone || ""} {c.address ? "• " + c.address : ""}
                    </div>
                  </div>
                ))}
                {customers.length > 8 ? (
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                    (Showing 8. The name dropdown includes all customers.)
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar slot modal */}
      <Modal
        open={slotModalOpen}
        title="Schedule Job"
        subtitle={`Selected: ${slotISODate} at ${slotTime}`}
        onClose={() => setSlotModalOpen(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={btnOutline} onClick={() => setSlotModalOpen(false)}>
              Cancel
            </button>
            <button
              style={btnPrimary}
              onClick={() => {
                // date/time already set when opening slot
                saveJob({ alsoSaveCustomer: true });
                setSlotModalOpen(false);
              }}
            >
              Save Scheduled Job
            </button>
          </div>
        }
      >
        <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 13 }}>
          Tip: Start typing the customer name to auto-fill, or enter a new customer manually.
        </div>
      </Modal>
    </div>
  );
}

/* ---------- Styles ---------- */

const appRoot = {
  minHeight: "100vh",
  background: "#f5f7fb",
  color: "#111827",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
};

const topbar = {
  height: 62,
  background: "white",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 18px",
};

const brandMark = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: "#0f7a2a",
  display: "grid",
  placeItems: "center",
  color: "white",
  fontWeight: 950,
};

const layout = { padding: 14 };

const sidebar = {
  background: "white",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const sidebarHead = {
  padding: 14,
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  fontWeight: 950,
  fontSize: 13,
  color: "#0f7a2a",
};

const navBtn = {
  width: "100%",
  textAlign: "left",
  padding: "12px 14px",
  border: "none",
  fontWeight: 950,
  cursor: "pointer",
};

const sidebarFooter = {
  padding: 14,
  borderTop: "1px solid rgba(0,0,0,0.06)",
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 14,
};

const card = {
  background: "white",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.08)",
  padding: 16,
};

const rightCol = { display: "grid", gap: 14 };

const cardHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const cardMiniHead = {
  padding: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 12,
  background: "#fbfcfe",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

const inputBase = {
  height: 38,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  padding: "0 10px",
  outline: "none",
  fontSize: 14,
  background: "white",
  fontWeight: 800,
};

const textareaBase = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  padding: 10,
  outline: "none",
  fontSize: 14,
  background: "white",
  minHeight: 110,
  resize: "vertical",
  fontWeight: 800,
};

const btnPrimary = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#0f7a2a",
  color: "white",
  fontWeight: 950,
  border: "1px solid rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const btnOutline = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "white",
  color: "#0f7a2a",
  fontWeight: 950,
  border: "1px solid rgba(15, 122, 42, 0.35)",
  cursor: "pointer",
};

const btnSmall = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const iconBtn = {
  height: 38,
  width: 38,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  fontWeight: 950,
  cursor: "pointer",
};

const sectionBox = {
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 14,
  padding: 12,
  background: "#fbfcfe",
};

const totalsBox = {
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 12,
  padding: 10,
  background: "white",
  display: "grid",
  gap: 6,
};

const chemRow = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.7fr 0.5fr 0.5fr 0.8fr auto",
  gap: 10,
  alignItems: "end",
  padding: 10,
  borderRadius: 12,
  background: "white",
  border: "1px solid rgba(0,0,0,0.08)",
};

const tableWrap = {
  marginTop: 12,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  overflow: "auto",
};

const table = { width: "100%", borderCollapse: "collapse", fontSize: 13 };

const th = {
  textAlign: "left",
  padding: "10px 10px",
  fontWeight: 950,
  color: "#0f7a2a",
  fontSize: 12,
};

const td = {
  padding: "10px 10px",
  verticalAlign: "top",
  fontWeight: 800,
  borderTop: "1px solid rgba(0,0,0,0.06)",
};

const tr = { cursor: "pointer" };

const emptyRow = { padding: 14, color: "#6b7280", fontWeight: 800 };

const miniRow = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#fbfcfe",
  cursor: "pointer",
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 14,
};

const modalCard = {
  width: "min(900px, 100%)",
  background: "white",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
  overflow: "hidden",
};

const modalHead = {
  padding: 14,
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const modalFooter = {
  padding: 14,
  borderTop: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const calendarGridWrap = {
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 14,
  overflow: "hidden",
  background: "white",
};

const calendarHeaderRow = {
  display: "flex",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  background: "#fbfcfe",
};

const calendarHeaderCell = {
  flex: 1,
  padding: 10,
  borderLeft: "1px solid rgba(0,0,0,0.06)",
};

const calendarBody = {
  display: "flex",
  alignItems: "stretch",
};

const timeCell = {
  height: 36,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
  color: "#6b7280",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  background: "#fbfcfe",
};

const dayCol = {
  flex: 1,
  borderLeft: "1px solid rgba(0,0,0,0.06)",
};

const slotCell = {
  height: 36,
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  padding: 4,
  cursor: "pointer",
  background: "white",
};

const scheduledChip = {
  borderRadius: 10,
  padding: "4px 6px",
  marginBottom: 4,
  background: "rgba(15, 122, 42, 0.10)",
  border: "1px solid rgba(15, 122, 42, 0.25)",
};
