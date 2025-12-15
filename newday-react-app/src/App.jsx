import React, { useEffect, useMemo, useState } from "react";

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

const DEFAULT_CHEMICALS = [
  { name: "FirstStrike (Rodent Bait)", epa: "" },
  { name: "CB-80 (Aerosol)", epa: "" },
  { name: "Transport (Insecticide)", epa: "" },
];

const LS_CUSTOMERS = "nd_customers_v1";
const LS_JOBS = "nd_jobs_v1";

function uid() {
  return (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
}

function money(n) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISO() {
  return toISODate(new Date());
}

function nowTimeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildGoogleMapsLink(address) {
  const q = encodeURIComponent(address || "");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function buildReceiptText({ business, job, customer }) {
  const lines = [];
  lines.push(business.name);
  lines.push(`${business.phone} • ${business.email}`);
  lines.push("--------------------------------------------------");
  lines.push(`Date/Time: ${job.date} ${job.time || ""}`.trim());
  lines.push(`Customer: ${customer?.name || job.customerName || ""}`);
  lines.push(`Address: ${customer?.address || job.address || ""}`);
  lines.push(`Phone: ${customer?.phone || job.phone || ""}`);
  lines.push(`Email: ${customer?.email || job.email || ""}`);
  lines.push("");
  lines.push(`Service Frequency: ${job.serviceType || ""}`);
  lines.push(`Pest Type(s): ${(job.pestTypes || []).join(", ") || "—"}`);
  lines.push("");
  lines.push("Chemicals Used:");
  if (!job.chemicals?.length) {
    lines.push("  —");
  } else {
    job.chemicals.forEach((c, idx) => {
      lines.push(
        `  ${idx + 1}. ${c.name} | Amount: ${c.amountUsed} ${c.amountUnit} | Mix ratio: ${c.mixRatio}`
      );
    });
  }
  lines.push("");
  lines.push("Notes:");
  lines.push(job.notes || "—");
  lines.push("");
  lines.push(`Subtotal: ${money(job.subtotal || 0)}`);
  lines.push(`NJ Tax (6.625%): ${money(job.tax || 0)}`);
  lines.push(`Total: ${money(job.total || 0)}`);
  lines.push("");
  lines.push("Thank you for your business!");
  return lines.join("\n");
}

// ---------- UI helpers ----------
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#1f2937" }}>{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        height: 38,
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.12)",
        padding: "0 10px",
        outline: "none",
        fontSize: 14,
        background: "white",
        ...(props.style || {}),
      }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      style={{
        height: 38,
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.12)",
        padding: "0 10px",
        outline: "none",
        fontSize: 14,
        background: "white",
        ...(props.style || {}),
      }}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      style={{
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.12)",
        padding: 10,
        outline: "none",
        fontSize: 14,
        background: "white",
        minHeight: 110,
        resize: "vertical",
        ...(props.style || {}),
      }}
    />
  );
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
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

function Button({ variant = "primary", children, ...props }) {
  const base = {
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    cursor: "pointer",
    userSelect: "none",
  };
  const styles =
    variant === "primary"
      ? { ...base, background: "#0f7a2a", color: "white" }
      : variant === "outline"
      ? { ...base, background: "white", color: "#0f7a2a", border: "1px solid rgba(15, 122, 42, 0.35)" }
      : variant === "danger"
      ? { ...base, background: "#b91c1c", color: "white" }
      : { ...base, background: "white", color: "#111827", border: "1px solid rgba(0,0,0,0.12)" };

  return (
    <button {...props} style={{ ...styles, ...(props.style || {}) }}>
      {children}
    </button>
  );
}

export default function App() {
  const business = useMemo(
    () => ({
      name: "New Day Pest Control",
      phone: "(201) 972-5592",
      email: "newdaypestcontrol@yahoo.com",
    }),
    []
  );

  // Navigation
  const [active, setActive] = useState("customers"); // customers | jobs | calendar | materials | receipts

  // Customers DB
  const [customers, setCustomers] = useState(() => safeJsonParse(localStorage.getItem(LS_CUSTOMERS), []));
  const [activeCustomerId, setActiveCustomerId] = useState(() => customers?.[0]?.id || null);

  // Jobs DB (scheduled work)
  const [jobs, setJobs] = useState(() => safeJsonParse(localStorage.getItem(LS_JOBS), []));

  // Persist
  useEffect(() => {
    localStorage.setItem(LS_CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(LS_JOBS, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    // keep active customer valid
    if (customers.length && !customers.some((c) => c.id === activeCustomerId)) {
      setActiveCustomerId(customers[0]?.id || null);
    }
  }, [customers, activeCustomerId]);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === activeCustomerId) || null,
    [customers, activeCustomerId]
  );

  // Customer form (edit/create)
  const [custName, setCustName] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPlan, setCustPlan] = useState("One-time");

  useEffect(() => {
    // autofill customer form from DB when selecting customer
    if (!activeCustomer) {
      setCustName("");
      setCustAddress("");
      setCustPhone("");
      setCustEmail("");
      setCustPlan("One-time");
      return;
    }
    setCustName(activeCustomer.name || "");
    setCustAddress(activeCustomer.address || "");
    setCustPhone(activeCustomer.phone || "");
    setCustEmail(activeCustomer.email || "");
    setCustPlan(activeCustomer.plan || "One-time");
  }, [activeCustomerId]); // eslint-disable-line react-hooks/exhaustive-deps

  function newCustomer() {
    const id = uid();
    const c = { id, name: "", address: "", phone: "", email: "", plan: "One-time", createdAt: Date.now() };
    setCustomers((prev) => [c, ...prev]);
    setActiveCustomerId(id);
    setActive("customers");
  }

  function saveCustomer() {
    if (!custName.trim()) return alert("Customer name is required.");
    const updated = {
      id: activeCustomerId || uid(),
      name: custName.trim(),
      address: custAddress.trim(),
      phone: custPhone.trim(),
      email: custEmail.trim(),
      plan: custPlan,
      createdAt: activeCustomer?.createdAt || Date.now(),
    };

    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((c) => (c.id === updated.id ? updated : c));
    });

    setActiveCustomerId(updated.id);
    alert("Customer saved ✅");
  }

  function deleteCustomer() {
    if (!activeCustomer) return;
    if (!confirm(`Delete customer "${activeCustomer.name || "Untitled"}"? This will also remove their jobs.`)) return;
    setCustomers((prev) => prev.filter((c) => c.id !== activeCustomer.id));
    setJobs((prev) => prev.filter((j) => j.customerId !== activeCustomer.id));
    setActiveCustomerId(null);
  }

  // Job form
  const [jobId, setJobId] = useState(null);
  const [jobDate, setJobDate] = useState(todayISO());
  const [jobTime, setJobTime] = useState(nowTimeHHMM());
  const [serviceType, setServiceType] = useState("One-time");
  const [pestTypes, setPestTypes] = useState([]);
  const [chemicals, setChemicals] = useState([{ name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]);
  const [notes, setNotes] = useState("");
  const [subtotalRaw, setSubtotalRaw] = useState("");

  // Auto-fill job customer fields from selected customer
  const [jobCustomerId, setJobCustomerId] = useState(null);

  useEffect(() => {
    // default job customer = active customer if available
    if (!jobCustomerId && activeCustomerId) setJobCustomerId(activeCustomerId);
  }, [activeCustomerId, jobCustomerId]);

  const jobCustomer = useMemo(
    () => customers.find((c) => c.id === jobCustomerId) || null,
    [customers, jobCustomerId]
  );

  useEffect(() => {
    // if user selects a customer for the job, set serviceType to their plan by default (like PestPac)
    if (jobCustomer?.plan) setServiceType(jobCustomer.plan);
  }, [jobCustomerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = useMemo(() => {
    const n = Number(String(subtotalRaw).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [subtotalRaw]);

  const tax = useMemo(() => subtotal * NJ_TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  function togglePest(p) {
    setPestTypes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function addChemicalRow() {
    setChemicals((prev) => [...prev, { name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]);
  }

  function updateChemical(idx, patch) {
    setChemicals((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeChemical(idx) {
    setChemicals((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }];
    });
  }

  function startNewJob() {
    if (!customers.length) {
      alert("Create a customer first.");
      setActive("customers");
      return;
    }
    setJobId(null);
    setJobCustomerId(activeCustomerId || customers[0].id);
    setJobDate(todayISO());
    setJobTime(nowTimeHHMM());
    setServiceType(jobCustomer?.plan || "One-time");
    setPestTypes([]);
    setChemicals([{ name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]);
    setNotes("");
    setSubtotalRaw("");
    setActive("jobs");
  }

  function saveJob() {
    if (!jobCustomerId) return alert("Select a customer for this job.");
    const c = customers.find((x) => x.id === jobCustomerId);
    if (!c?.name) return alert("Selected customer is missing a name.");

    const cleanedChem = chemicals
      .map((x) => ({
        name: (x.name || "").trim(),
        amountUsed: (x.amountUsed || "").trim(),
        amountUnit: (x.amountUnit || "oz").trim(),
        mixRatio: (x.mixRatio || "").trim(),
      }))
      .filter((x) => x.name || x.amountUsed || x.mixRatio);

    const id = jobId || uid();
    const job = {
      id,
      customerId: jobCustomerId,
      date: jobDate,
      time: jobTime,
      serviceType,
      pestTypes,
      chemicals: cleanedChem,
      notes,
      subtotal,
      tax,
      total,
      createdAt: jobId ? (jobs.find((j) => j.id === jobId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
    };

    setJobs((prev) => {
      const exists = prev.some((j) => j.id === id);
      if (!exists) return [job, ...prev];
      return prev.map((j) => (j.id === id ? job : j));
    });

    setJobId(id);
    alert("Job saved ✅");
  }

  function deleteJob(id) {
    if (!confirm("Delete this job?")) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (jobId === id) setJobId(null);
  }

  function loadJobIntoForm(job) {
    setJobId(job.id);
    setJobCustomerId(job.customerId);
    setJobDate(job.date || todayISO());
    setJobTime(job.time || "09:00");
    setServiceType(job.serviceType || "One-time");
    setPestTypes(Array.isArray(job.pestTypes) ? job.pestTypes : []);
    setChemicals(
      Array.isArray(job.chemicals) && job.chemicals.length
        ? job.chemicals.map((c) => ({
            name: c.name || "",
            amountUsed: c.amountUsed || "",
            amountUnit: c.amountUnit || "oz",
            mixRatio: c.mixRatio || "",
          }))
        : [{ name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]
    );
    setNotes(job.notes || "");
    setSubtotalRaw(String(job.subtotal ?? ""));
    setActive("jobs");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Receipt (mailto)
  const receiptText = useMemo(() => {
    const c = customers.find((x) => x.id === jobCustomerId) || null;
    const job = {
      id: jobId || "draft",
      customerName: c?.name || "",
      address: c?.address || "",
      phone: c?.phone || "",
      email: c?.email || "",
      date: jobDate,
      time: jobTime,
      serviceType,
      pestTypes,
      chemicals,
      notes,
      subtotal,
      tax,
      total,
    };
    return buildReceiptText({ business, job, customer: c });
  }, [
    business,
    customers,
    jobCustomerId,
    jobId,
    jobDate,
    jobTime,
    serviceType,
    pestTypes,
    chemicals,
    notes,
    subtotal,
    tax,
    total,
  ]);

  const mailtoHref = useMemo(() => {
    const c = customers.find((x) => x.id === jobCustomerId) || null;
    const to = (c?.email || "").trim();
    const subject = encodeURIComponent(`Receipt - New Day Pest Control - ${jobDate} ${jobTime}`);
    const body = encodeURIComponent(receiptText);
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [customers, jobCustomerId, jobDate, jobTime, receiptText]);

  // Calendar (month view)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const jobsByDay = useMemo(() => {
    const map = new Map();
    jobs.forEach((j) => {
      const key = j.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(j);
    });
    // sort each day by time
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      map.set(k, arr);
    }
    return map;
  }, [jobs]);

  const monthGrid = useMemo(() => {
    const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const firstDay = start.getDay(); // 0 Sun
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - firstDay);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calMonth]);

  const pageTitle = useMemo(() => {
    if (active === "customers") return "Customers";
    if (active === "jobs") return "Jobs";
    if (active === "calendar") return "Calendar";
    if (active === "materials") return "Materials";
    if (active === "receipts") return "Receipts";
    return "App";
  }, [active]);

  // UI
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#111827",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 62,
          background: "white",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#0f7a2a",
              display: "grid",
              placeItems: "center",
              color: "white",
              fontWeight: 950,
            }}
          >
            ND
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>{business.name}</div>
            <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 800 }}>
              {business.phone} • {business.email}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill>NJ Tax: 6.625%</Pill>
          <div style={{ height: 36, width: 1, background: "rgba(0,0,0,0.10)" }} />
          <div style={{ fontWeight: 950, color: "#0f7a2a" }}>{pageTitle}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, padding: 14 }}>
        {/* Sidebar */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 950, fontSize: 13, color: "#0f7a2a" }}>MENU</div>
          </div>

          {[
            { id: "customers", label: "Customers" },
            { id: "jobs", label: "Jobs" },
            { id: "calendar", label: "Calendar" },
            { id: "materials", label: "Materials" },
            { id: "receipts", label: "Receipts" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                background: active === item.id ? "rgba(15, 122, 42, 0.10)" : "transparent",
                color: active === item.id ? "#0f7a2a" : "#111827",
                fontWeight: 950,
                cursor: "pointer",
                borderLeft: active === item.id ? "4px solid #0f7a2a" : "4px solid transparent",
              }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ padding: 14, borderTop: "1px solid rgba(0,0,0,0.06)", color: "#6b7280" }}>
            <div style={{ fontSize: 12, fontWeight: 900 }}>Saved</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Customers: <b>{customers.length}</b>
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Jobs: <b>{jobs.length}</b>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", padding: 16 }}>
          {/* CUSTOMERS PAGE */}
          {active === "customers" && (
            <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Customer Database</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Save customers once, then jobs auto-fill.
                    </div>
                  </div>
                  <Button onClick={newCustomer}>+ New</Button>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  {customers.length === 0 ? (
                    <div style={{ padding: 14, color: "#6b7280", fontWeight: 800 }}>
                      No customers yet. Click <b>+ New</b>.
                    </div>
                  ) : (
                    customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setActiveCustomerId(c.id)}
                        style={{
                          padding: 12,
                          borderTop: "1px solid rgba(0,0,0,0.06)",
                          cursor: "pointer",
                          background: c.id === activeCustomerId ? "rgba(15, 122, 42, 0.07)" : "white",
                        }}
                      >
                        <div style={{ fontWeight: 950 }}>{c.name || "Untitled"}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                          {(c.phone || "").trim()} {c.plan ? `• ${c.plan}` : ""}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ height: 12 }} />
                <Button variant="outline" onClick={startNewJob} style={{ width: "100%" }}>
                  Schedule a Job for this Customer
                </Button>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>Customer Details</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline" onClick={saveCustomer}>
                      Save
                    </Button>
                    <Button variant="danger" onClick={deleteCustomer}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                  <Field label="Customer Name">
                    <Input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Full name" />
                  </Field>
                  <Field label="Service Plan">
                    <Select value={custPlan} onChange={(e) => setCustPlan(e.target.value)}>
                      {SERVICE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Address">
                      <Input
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        placeholder="Street, City, NJ ZIP"
                      />
                    </Field>
                    <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                      <a
                        href={buildGoogleMapsLink(custAddress)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#0f7a2a",
                          fontWeight: 900,
                          textDecoration: "none",
                        }}
                        onClick={(e) => {
                          if (!custAddress.trim()) {
                            e.preventDefault();
                            alert("Add an address first, then click Maps.");
                          }
                        }}
                      >
                        Open in Google Maps
                      </a>
                      <span style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                        (uses the address above)
                      </span>
                    </div>
                  </div>

                  <Field label="Phone Number">
                    <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="(###) ###-####" />
                  </Field>

                  <Field label="Email">
                    <Input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder="customer@email.com" />
                  </Field>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ borderTop: "1px solid rgba(0,0,0,0.10)", paddingTop: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 8 }}>Upcoming Jobs (for this customer)</div>
                  <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    {jobs
                      .filter((j) => j.customerId === activeCustomerId)
                      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                      .slice(0, 6)
                      .map((j) => (
                        <div
                          key={j.id}
                          style={{
                            padding: 12,
                            borderTop: "1px solid rgba(0,0,0,0.06)",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 950 }}>
                              <span style={{ fontWeight: 950 }}>{j.date}</span>{" "}
                              <span style={{ color: "#6b7280" }}>{j.time || ""}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                              {(j.pestTypes || []).join(", ") || "—"} • {money(j.total || 0)}
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => loadJobIntoForm(j)}>
                            Open
                          </Button>
                        </div>
                      ))}
                    {jobs.filter((j) => j.customerId === activeCustomerId).length === 0 && (
                      <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>No jobs yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JOBS PAGE */}
          {active === "jobs" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 0.95fr", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Schedule Job</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Pick a customer, choose date/time, pests, chemicals, totals, receipt.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline" onClick={startNewJob}>
                      New
                    </Button>
                    <Button onClick={saveJob}>Save</Button>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.6fr", gap: 12 }}>
                  <Field label="Customer (auto-fills info)">
                    <Select value={jobCustomerId || ""} onChange={(e) => setJobCustomerId(e.target.value)}>
                      <option value="" disabled>
                        Select customer…
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || "Untitled"}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Date">
                    <Input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
                  </Field>

                  <Field label="Time">
                    <Input type="time" value={jobTime} onChange={(e) => setJobTime(e.target.value)} />
                  </Field>
                </div>

                <div style={{ height: 10 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Service Frequency">
                    <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                      {SERVICE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Charge (subtotal)">
                    <Input value={subtotalRaw} onChange={(e) => setSubtotalRaw(e.target.value)} placeholder="e.g. 149.00" />
                  </Field>

                  <Field label="Totals">
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
                        <span>Tax</span>
                        <span>{money(tax)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 950, color: "#0f7a2a" }}>
                        <span>Total</span>
                        <span>{money(total)}</span>
                      </div>
                    </div>
                  </Field>
                </div>

                <div style={{ height: 12 }} />

                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fbfcfe",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 950 }}>Pest Type(s)</div>
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

                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fbfcfe",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>Chemicals Used</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        Multiple chemicals per job • amount used • mix ratio • editable
                      </div>
                    </div>
                    <Button variant="outline" onClick={addChemicalRow}>
                      + Add Chemical
                    </Button>
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={{ display: "grid", gap: 10 }}>
                    {chemicals.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 0.6fr 0.5fr 1fr auto",
                          gap: 10,
                          alignItems: "end",
                          padding: 10,
                          borderRadius: 12,
                          background: "white",
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <Field label="Chemical">
                          <Select value={c.name} onChange={(e) => updateChemical(idx, { name: e.target.value })}>
                            <option value="">Select or type below…</option>
                            {DEFAULT_CHEMICALS.map((x) => (
                              <option key={x.name} value={x.name}>
                                {x.name}
                              </option>
                            ))}
                          </Select>
                          <div style={{ height: 6 }} />
                          <Input value={c.name} onChange={(e) => updateChemical(idx, { name: e.target.value })} placeholder="Type chemical name" />
                        </Field>

                        <Field label="Amount Used">
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

                        <button
                          onClick={() => removeChemical(idx)}
                          style={{
                            height: 38,
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "white",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                          title="Remove chemical"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                  <Field label="Notes">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Areas treated, findings, customer requests, etc." />
                  </Field>

                  <div
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 14,
                      padding: 12,
                      background: "#fbfcfe",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>Receipt</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Email uses your email program for now (mailto). Real “send from app” comes next.
                    </div>

                    <a
                      href={mailtoHref}
                      style={{
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#0f7a2a",
                        color: "white",
                        fontWeight: 900,
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                      onClick={(e) => {
                        const c = customers.find((x) => x.id === jobCustomerId);
                        if (!c?.email?.trim()) {
                          e.preventDefault();
                          alert("Add the customer email first (Customers page).");
                        }
                      }}
                    >
                      Email Receipt
                    </a>

                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(receiptText)
                          .then(() => alert("Receipt copied ✅"))
                          .catch(() => alert("Copy failed (browser permission)."));
                      }}
                    >
                      Copy Receipt Text
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Saved Jobs</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Click to open/edit. Calendar shows these dates.
                    </div>
                  </div>
                  <Pill>{jobs.length} jobs</Pill>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  {jobs.length === 0 ? (
                    <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>No jobs saved yet.</div>
                  ) : (
                    jobs
                      .slice()
                      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                      .map((j) => {
                        const c = customers.find((x) => x.id === j.customerId);
                        return (
                          <div
                            key={j.id}
                            style={{
                              padding: 12,
                              borderTop: "1px solid rgba(0,0,0,0.06)",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div style={{ cursor: "pointer" }} onClick={() => loadJobIntoForm(j)}>
                              <div style={{ fontWeight: 950 }}>
                                <span style={{ fontWeight: 950 }}>{j.date}</span>{" "}
                                <span style={{ color: "#6b7280" }}>{j.time || ""}</span> •{" "}
                                {c?.name || "Customer"}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                                {(j.pestTypes || []).join(", ") || "—"} • {money(j.total || 0)}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                                {c?.address ? (
                                  <a
                                    href={buildGoogleMapsLink(c.address)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#0f7a2a", fontWeight: 900, textDecoration: "none" }}
                                  >
                                    Maps
                                  </a>
                                ) : (
                                  "No address"
                                )}
                              </div>
                            </div>

                            <Button variant="danger" onClick={() => deleteJob(j.id)}>
                              Delete
                            </Button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR PAGE */}
          {active === "calendar" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>Calendar</div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                    Future scheduled jobs show here. Click a job to open it.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Button
                    variant="outline"
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  >
                    ◀
                  </Button>
                  <Pill>
                    {calMonth.toLocaleString(undefined, { month: "long" })} {calMonth.getFullYear()}
                  </Pill>
                  <Button
                    variant="outline"
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  >
                    ▶
                  </Button>
                  <Button variant="outline" onClick={() => setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                    Today
                  </Button>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} style={{ fontSize: 12, fontWeight: 950, color: "#0f7a2a" }}>
                    {d}
                  </div>
                ))}
              </div>

              <div style={{ height: 8 }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {monthGrid.map((d) => {
                  const dateStr = toISODate(d);
                  const inMonth = d.getMonth() === calMonth.getMonth();
                  const dayJobs = jobsByDay.get(dateStr) || [];

                  return (
                    <div
                      key={dateStr}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        background: "white",
                        minHeight: 110,
                        padding: 10,
                        opacity: inMonth ? 1 : 0.45,
                      }}
                    >
                      {/* DATE IN BOLD (your request) */}
                      <div style={{ fontWeight: 950, marginBottom: 8 }}>
                        {d.getDate()}
                      </div>

                      {dayJobs.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>—</div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {dayJobs.slice(0, 3).map((j) => {
                            const c = customers.find((x) => x.id === j.customerId);
                            return (
                              <div
                                key={j.id}
                                onClick={() => loadJobIntoForm(j)}
                                style={{
                                  cursor: "pointer",
                                  borderRadius: 10,
                                  padding: "6px 8px",
                                  background: "rgba(15, 122, 42, 0.10)",
                                  border: "1px solid rgba(15, 122, 42, 0.18)",
                                }}
                                title="Click to open this job"
                              >
                                <div style={{ fontSize: 12, fontWeight: 950, color: "#0f7a2a" }}>
                                  {j.time || ""} {c?.name || "Customer"}
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", fontWeight: 800 }}>
                                  {(j.pestTypes || []).slice(0, 2).join(", ") || "—"}
                                </div>
                              </div>
                            );
                          })}
                          {dayJobs.length > 3 && (
                            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>
                              +{dayJobs.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ height: 14 }} />

              <Button onClick={startNewJob}>+ Schedule New Job</Button>
            </div>
          )}

          {/* MATERIALS PAGE */}
          {active === "materials" && (
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>Materials</div>
              <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 800 }}>
                Next: chemical library with EPA # list + inventory.
              </div>
            </div>
          )}

          {/* RECEIPTS PAGE */}
          {active === "receipts" && (
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>Receipts</div>
              <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 800 }}>
                Receipts are created from Jobs. Use Jobs → Email Receipt / Copy Receipt.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
