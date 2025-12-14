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

const CHEMICAL_LIBRARY = [
  { name: "FirstStrike (Rodent Bait)", epa: "" },
  { name: "CB-80 (Aerosol)", epa: "" },
  { name: "Transport (Insecticide)", epa: "" },
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

function buildReceiptText(job) {
  const lines = [];
  lines.push("New Day Pest Control");
  lines.push("(201) 972-5592 • newdaypestcontrol@yahoo.com");
  lines.push("--------------------------------------------------");
  lines.push(`Date: ${job.date}`);
  lines.push(`Customer: ${job.customerName}`);
  lines.push(`Address: ${job.address}`);
  lines.push(`Phone: ${job.phone}`);
  lines.push(`Email: ${job.email}`);
  lines.push("");
  lines.push(`Service Type: ${job.serviceType}`);
  lines.push(`Pest Type(s): ${job.pestTypes.join(", ") || "—"}`);
  lines.push("");
  lines.push("Chemicals Used:");
  if (!job.chemicals.length) {
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
  lines.push(`Subtotal: ${money(job.subtotal)}`);
  lines.push(`NJ Tax (6.625%): ${money(job.tax)}`);
  lines.push(`Total: ${money(job.total)}`);
  lines.push("");
  lines.push("Thank you for your business!");
  return lines.join("\n");
}

function MailtoReceiptButton({ job }) {
  const subject = encodeURIComponent(`Receipt - New Day Pest Control - ${job.date}`);
  const body = encodeURIComponent(buildReceiptText(job));
  const to = (job.email || "").trim();
  const href = `mailto:${to}?subject=${subject}&body=${body}`;

  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px",
        borderRadius: 10,
        background: "#0f7a2a",
        color: "white",
        fontWeight: 700,
        border: "1px solid rgba(0,0,0,0.08)",
        cursor: to ? "pointer" : "not-allowed",
        opacity: to ? 1 : 0.55,
      }}
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
      <div style={{ fontSize: 12, fontWeight: 800, color: "#1f2937" }}>{label}</div>
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
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

export default function App() {
  const [active, setActive] = useState("customers");

  // Customer / Job fields (PestPac-style single “work order” form)
  const [date, setDate] = useState(todayISO());
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [serviceType, setServiceType] = useState("One-time");
  const [pestTypes, setPestTypes] = useState([]); // multi-select

  const [chemicals, setChemicals] = useState([
    { name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" },
  ]);

  const [notes, setNotes] = useState("");
  const [subtotalRaw, setSubtotalRaw] = useState("");

  const subtotal = useMemo(() => {
    const n = Number(String(subtotalRaw).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [subtotalRaw]);

  const tax = useMemo(() => subtotal * NJ_TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  // Saved jobs list (local only for now)
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("nd_jobs_v1");
    if (saved) {
      try {
        setJobs(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("nd_jobs_v1", JSON.stringify(jobs));
  }, [jobs]);

  const currentJob = useMemo(
    () => ({
      id: crypto?.randomUUID?.() || String(Date.now()),
      date,
      customerName,
      address,
      phone,
      email,
      serviceType,
      pestTypes,
      chemicals: chemicals
        .map((c) => ({
          name: (c.name || "").trim(),
          amountUsed: (c.amountUsed || "").trim(),
          amountUnit: (c.amountUnit || "oz").trim(),
          mixRatio: (c.mixRatio || "").trim(),
        }))
        .filter((c) => c.name || c.amountUsed || c.mixRatio),
      notes,
      subtotal,
      tax,
      total,
    }),
    [
      date,
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
    ]
  );

  function resetForm() {
    setDate(todayISO());
    setCustomerName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setServiceType("One-time");
    setPestTypes([]);
    setChemicals([{ name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]);
    setNotes("");
    setSubtotalRaw("");
  }

  function saveJob() {
    if (!customerName.trim()) return alert("Customer name is required.");
    if (!address.trim()) return alert("Address is required.");
    if (!phone.trim()) return alert("Phone is required.");

    setJobs((prev) => [{ ...currentJob }, ...prev]);
    alert("Saved ✅");
    // keep form values (like PestPac), but you can reset if you want:
    // resetForm();
  }

  function removeJob(id) {
    if (!confirm("Delete this saved job?")) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function loadJob(job) {
    setActive("customers");
    setDate(job.date || todayISO());
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
            amountUsed: c.amountUsed || "",
            amountUnit: c.amountUnit || "oz",
            mixRatio: c.mixRatio || "",
          }))
        : [{ name: "", amountUsed: "", amountUnit: "oz", mixRatio: "" }]
    );
    setNotes(job.notes || "");
    setSubtotalRaw(String(job.subtotal ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function togglePest(pest) {
    setPestTypes((prev) => (prev.includes(pest) ? prev.filter((p) => p !== pest) : [...prev, pest]));
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

  const pageTitle = useMemo(() => {
    if (active === "customers") return "Customers / Service Ticket";
    if (active === "calendar") return "Calendar";
    if (active === "materials") return "Materials";
    if (active === "contracts") return "Contracts";
    if (active === "receipts") return "Receipts";
    return "Jobs";
  }, [active]);

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
              fontWeight: 900,
            }}
          >
            ND
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>New Day Pest Control</div>
            <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 700 }}>
              (201) 972-5592 • newdaypestcontrol@yahoo.com
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill>NJ Tax: 6.625%</Pill>
          <div style={{ height: 36, width: 1, background: "rgba(0,0,0,0.10)" }} />
          <div style={{ fontWeight: 900, color: "#0f7a2a" }}>{pageTitle}</div>
        </div>
      </div>

      {/* Body */}
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
            <div style={{ fontWeight: 900, fontSize: 13, color: "#0f7a2a" }}>MENU</div>
          </div>

          {[
            { id: "customers", label: "Customers" },
            { id: "jobs", label: "Jobs" },
            { id: "calendar", label: "Calendar" },
            { id: "materials", label: "Materials" },
            { id: "contracts", label: "Contracts" },
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
                fontWeight: 900,
                cursor: "pointer",
                borderLeft: active === item.id ? "4px solid #0f7a2a" : "4px solid transparent",
              }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ padding: 14, borderTop: "1px solid rgba(0,0,0,0.06)", color: "#6b7280" }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Status</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Local save: <b>ON</b> (browser)
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
          {/* Left: form */}
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              padding: 16,
            }}
          >
            {active !== "customers" ? (
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 950 }}>{pageTitle}</div>
                <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 700 }}>
                  This section is coming next. For now, the working PestPac-style screen is under{" "}
                  <b>Customers</b>.
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Service Ticket</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                      Customer + job details, chemicals, notes, totals, and receipt.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      onClick={saveJob}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#0f7a2a",
                        color: "white",
                        fontWeight: 900,
                        border: "1px solid rgba(0,0,0,0.08)",
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>

                    <button
                      onClick={resetForm}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "white",
                        color: "#111827",
                        fontWeight: 900,
                        border: "1px solid rgba(0,0,0,0.12)",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                {/* Customer row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Date">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                  <Field label="Service Type">
                    <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                      {SERVICE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
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
                  <Field label="Customer Name">
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer full name" />
                  </Field>
                  <Field label="Phone">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(###) ###-####" />
                  </Field>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Address">
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, NJ ZIP" />
                    </Field>
                  </div>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Email">
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" />
                    </Field>
                  </div>
                </div>

                <div style={{ height: 14 }} />

                {/* Pest types */}
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fbfcfe",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 950 }}>Service Type (Pest)</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Select all that apply</div>
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

                <div style={{ height: 14 }} />

                {/* Chemicals */}
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
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                        Multiple chemicals per job • amount used • mix ratio • editable
                      </div>
                    </div>

                    <button
                      onClick={addChemicalRow}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "white",
                        color: "#0f7a2a",
                        fontWeight: 950,
                        border: "1px solid rgba(15, 122, 42, 0.35)",
                        cursor: "pointer",
                      }}
                    >
                      + Add Chemical
                    </button>
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
                          <Select
                            value={c.name}
                            onChange={(e) => updateChemical(idx, { name: e.target.value })}
                          >
                            <option value="">Select or type below…</option>
                            {CHEMICAL_LIBRARY.map((x) => (
                              <option key={x.name} value={x.name}>
                                {x.name}
                              </option>
                            ))}
                          </Select>
                          <div style={{ height: 6 }} />
                          <Input
                            value={c.name}
                            onChange={(e) => updateChemical(idx, { name: e.target.value })}
                            placeholder="Type chemical name (editable)"
                          />
                        </Field>

                        <Field label="Amount Used">
                          <Input
                            value={c.amountUsed}
                            onChange={(e) => updateChemical(idx, { amountUsed: e.target.value })}
                            placeholder="e.g. 2.5"
                            inputMode="decimal"
                          />
                        </Field>

                        <Field label="Unit">
                          <Select
                            value={c.amountUnit}
                            onChange={(e) => updateChemical(idx, { amountUnit: e.target.value })}
                          >
                            <option value="oz">oz</option>
                            <option value="ml">ml</option>
                            <option value="gal">gal</option>
                            <option value="qt">qt</option>
                            <option value="lb">lb</option>
                            <option value="g">g</option>
                          </Select>
                        </Field>

                        <Field label="Mix Ratio">
                          <Input
                            value={c.mixRatio}
                            onChange={(e) => updateChemical(idx, { mixRatio: e.target.value })}
                            placeholder='e.g. "1 oz / 1 gal"'
                          />
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

                <div style={{ height: 14 }} />

                {/* Notes + totals + receipt */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                  <Field label="Notes">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes about the job, areas treated, findings, etc." />
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
                    <div style={{ fontWeight: 950 }}>Totals</div>

                    <div style={{ display: "grid", gap: 8, fontWeight: 800 }}>
                      <Row label="Subtotal" value={money(subtotal)} />
                      <Row label="NJ Tax (6.625%)" value={money(tax)} />
                      <div style={{ height: 1, background: "rgba(0,0,0,0.10)" }} />
                      <Row label="Total" value={money(total)} strong />
                    </div>

                    <div style={{ height: 6 }} />

                    <MailtoReceiptButton job={currentJob} />

                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                      This uses your email app (mailto). Later we’ll wire real email sending from the app.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: saved list (acts like a simple “PestPac list”) */}
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              minHeight: 520,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>Saved Tickets</div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                  Click a row to load it back into the form.
                </div>
              </div>
              <Pill>{jobs.length} saved</Pill>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ overflow: "auto", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(15, 122, 42, 0.10)" }}>
                    <th style={th}>Date</th>
                    <th style={th}>Customer</th>
                    <th style={th}>Pest</th>
                    <th style={th}>Total</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 14, color: "#6b7280", fontWeight: 700 }}>
                        No saved tickets yet. Fill the form and click <b>Save</b>.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr
                        key={j.id}
                        style={{ borderTop: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}
                        onClick={() => loadJob(j)}
                      >
                        <td style={td}>{j.date}</td>
                        <td style={td}>
                          <div style={{ fontWeight: 950 }}>{j.customerName}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                            {j.phone}
                          </div>
                        </td>
                        <td style={td}>
                          {(j.pestTypes || []).slice(0, 2).join(", ") || "—"}
                          {(j.pestTypes || []).length > 2 ? "…" : ""}
                        </td>
                        <td style={td}>{money(j.total)}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeJob(j.id);
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "white",
                              fontWeight: 900,
                              cursor: "pointer",
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

            <div style={{ height: 12 }} />

            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
              Next step after you confirm this looks right: we’ll add a real database + real login + real email sending.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ color: "#374151", fontWeight: strong ? 950 : 800 }}>{label}</div>
      <div style={{ color: "#111827", fontWeight: strong ? 950 : 900 }}>{value}</div>
    </div>
  );
}

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
};
