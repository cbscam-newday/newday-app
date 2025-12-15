import React, { useEffect, useMemo, useState } from "react";

const NJ_TAX_RATE = 0.06625;

const SERVICE_PLANS = ["One-time", "Monthly", "Quarterly"];
const PEST_TYPES = [
  "Mice",
  "Rats",
  "Ants",
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
  { id: "c1", name: "FirstStrike (Rodent Bait)", epa: "" },
  { id: "c2", name: "CB-80 (Aerosol)", epa: "" },
  { id: "c3", name: "Transport (Insecticide)", epa: "" },
];

const LS = {
  customers: "nd_customers_v2",
  jobs: "nd_jobs_v2",
  chemicals: "nd_chemicals_v2",
};

function uid() {
  return (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function money(n) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatNiceDate(isoDate) {
  // isoDate = YYYY-MM-DD
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function mapsUrl(address) {
  const q = encodeURIComponent(address || "");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function buildReceiptText({ business, customer, job, totals, chemicals }) {
  const lines = [];
  lines.push(business.name);
  lines.push(`${business.phone} • ${business.email}`);
  lines.push("--------------------------------------------------");
  lines.push(`DATE/TIME: ${job.startDate} ${job.startTime}`);
  lines.push(`CUSTOMER: ${customer.name}`);
  lines.push(`PHONE: ${customer.phone}`);
  lines.push(`EMAIL: ${customer.email}`);
  lines.push(`ADDRESS: ${customer.address}`);
  lines.push("");
  lines.push(`SERVICE PLAN: ${job.servicePlan}`);
  lines.push(`PEST TYPE(S): ${(job.pests || []).join(", ") || "—"}`);
  lines.push("");
  lines.push("CHEMICALS USED:");
  if (!chemicals.length) lines.push("  —");
  chemicals.forEach((c, i) => {
    lines.push(
      `  ${i + 1}. ${c.chemicalName}${c.epa ? ` (EPA ${c.epa})` : ""} | ${c.amount || ""} ${c.unit || ""} | Ratio: ${c.ratio || ""}`
    );
  });
  lines.push("");
  lines.push("NOTES:");
  lines.push(job.notes?.trim() ? job.notes.trim() : "—");
  lines.push("");
  lines.push(`SUBTOTAL: ${money(totals.subtotal)}`);
  lines.push(`NJ TAX (6.625%): ${money(totals.tax)}`);
  lines.push(`TOTAL: ${money(totals.total)}`);
  lines.push("");
  lines.push("Thank you for your business!");
  return lines.join("\n");
}

/** Simple UI pieces */
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
        ...props.style,
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
        ...props.style,
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
        ...props.style,
      }}
    />
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#1f2937" }}>{label}</div>
      {children}
    </div>
  );
}

function Btn({ variant = "primary", children, ...props }) {
  const styles =
    variant === "primary"
      ? { background: "#0f7a2a", color: "white", border: "1px solid rgba(0,0,0,0.08)" }
      : variant === "danger"
      ? { background: "#b91c1c", color: "white", border: "1px solid rgba(0,0,0,0.08)" }
      : { background: "white", color: "#111827", border: "1px solid rgba(0,0,0,0.12)" };

  return (
    <button
      {...props}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        fontWeight: 900,
        cursor: "pointer",
        ...styles,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
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
      }}
    >
      {children}
    </span>
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

  const [tab, setTab] = useState("customers");

  // Data
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [chemicals, setChemicals] = useState([]);

  // UI State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const selectedCustomer = useMemo(() => customers.find((c) => c.id === selectedCustomerId) || null, [customers, selectedCustomerId]);

  const [customerForm, setCustomerForm] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    plan: "One-time",
  });

  // Job editor
  const [jobId, setJobId] = useState("");
  const [jobStartDate, setJobStartDate] = useState(todayISO());
  const [jobStartTime, setJobStartTime] = useState("09:00");
  const [jobServicePlan, setJobServicePlan] = useState("One-time");
  const [jobPests, setJobPests] = useState([]);
  const [jobNotes, setJobNotes] = useState("");
  const [jobSubtotalRaw, setJobSubtotalRaw] = useState("");

  const [jobChemRows, setJobChemRows] = useState([
    { rowId: uid(), chemicalId: chemicals[0]?.id || "", amount: "", unit: "oz", ratio: "" },
  ]);

  // Calendar
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() }; // m=0..11
  });
  const [calSelectedDate, setCalSelectedDate] = useState(todayISO());

  // Load data from localStorage
  useEffect(() => {
    const c = safeParse(localStorage.getItem(LS.customers) || "[]", []);
    const j = safeParse(localStorage.getItem(LS.jobs) || "[]", []);
    const ch = safeParse(localStorage.getItem(LS.chemicals) || "[]", []);
    setCustomers(Array.isArray(c) ? c : []);
    setJobs(Array.isArray(j) ? j : []);
    setChemicals(Array.isArray(ch) && ch.length ? ch : DEFAULT_CHEMICALS);

    // default selection
    if (Array.isArray(c) && c.length) setSelectedCustomerId(c[0].id);
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(LS.customers, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(LS.jobs, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(LS.chemicals, JSON.stringify(chemicals));
  }, [chemicals]);

  // Keep chemical rows valid when chemicals load/change
  useEffect(() => {
    setJobChemRows((prev) => {
      const firstId = chemicals[0]?.id || "";
      const next = prev.map((r) => ({ ...r, chemicalId: r.chemicalId || firstId }));
      return next.length ? next : [{ rowId: uid(), chemicalId: firstId, amount: "", unit: "oz", ratio: "" }];
    });
  }, [chemicals]);

  // Auto-fill job from selected customer (your request #3)
  useEffect(() => {
    if (!selectedCustomer) return;
    // Auto-fill service plan too
    setJobServicePlan(selectedCustomer.plan || "One-time");
  }, [selectedCustomer]);

  // Totals
  const subtotal = useMemo(() => {
    const n = Number(String(jobSubtotalRaw).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [jobSubtotalRaw]);

  const tax = useMemo(() => subtotal * NJ_TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  function resetCustomerForm() {
    setCustomerForm({ id: "", name: "", address: "", phone: "", email: "", plan: "One-time" });
  }

  function newCustomer() {
    resetCustomerForm();
    setTab("customers");
  }

  function saveCustomer() {
    const name = customerForm.name.trim();
    if (!name) return alert("Customer name is required.");
    const phone = customerForm.phone.trim();
    if (!phone) return alert("Phone number is required.");
    const address = customerForm.address.trim();
    if (!address) return alert("Address is required.");

    if (customerForm.id) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerForm.id ? { ...c, ...customerForm, name, phone, address, email: customerForm.email.trim() } : c))
      );
      setSelectedCustomerId(customerForm.id);
    } else {
      const id = uid();
      const created = { ...customerForm, id, name, phone, address, email: customerForm.email.trim() };
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(id);
    }
    alert("Customer saved ✅");
  }

  function deleteCustomer() {
    if (!customerForm.id) return alert("Load a customer first.");
    if (!confirm("Delete this customer and their jobs?")) return;

    const id = customerForm.id;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setJobs((prev) => prev.filter((j) => j.customerId !== id));
    resetCustomerForm();
    setSelectedCustomerId("");
  }

  function loadCustomer(id) {
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setCustomerForm({ ...c });
    setSelectedCustomerId(id);
  }

  function startNewJob(forCustomerId = selectedCustomerId) {
    if (!forCustomerId) return alert("Select a customer first.");
    setTab("jobs");
    setJobId(""); // new
    setJobStartDate(todayISO());
    setJobStartTime("09:00");
    const c = customers.find((x) => x.id === forCustomerId);
    setSelectedCustomerId(forCustomerId);
    setJobServicePlan(c?.plan || "One-time");
    setJobPests([]);
    setJobNotes("");
    setJobSubtotalRaw("");
    setJobChemRows([{ rowId: uid(), chemicalId: chemicals[0]?.id || "", amount: "", unit: "oz", ratio: "" }]);
  }

  function saveJob() {
    if (!selectedCustomerId) return alert("Select a customer first.");
    const c = customers.find((x) => x.id === selectedCustomerId);
    if (!c) return alert("Customer not found.");
    if (!jobStartDate) return alert("Pick a date.");
    if (!jobStartTime) return alert("Pick a time.");

    const cleanedChem = jobChemRows
      .map((r) => {
        const chem = chemicals.find((x) => x.id === r.chemicalId);
        return {
          chemicalId: r.chemicalId,
          chemicalName: chem?.name || "",
          epa: chem?.epa || "",
          amount: String(r.amount || "").trim(),
          unit: r.unit || "oz",
          ratio: String(r.ratio || "").trim(),
        };
      })
      .filter((r) => r.chemicalId && (r.chemicalName || r.amount || r.ratio));

    const payload = {
      id: jobId || uid(),
      customerId: selectedCustomerId,
      startDate: jobStartDate,
      startTime: jobStartTime,
      servicePlan: jobServicePlan,
      pests: jobPests,
      notes: jobNotes,
      subtotal,
      tax,
      total,
      chemicalsUsed: cleanedChem,
      // snapshot customer fields (so old receipts keep the old address if it changes later)
      customerSnapshot: { name: c.name, address: c.address, phone: c.phone, email: c.email },
      createdAt: Date.now(),
    };

    setJobs((prev) => {
      const exists = prev.some((x) => x.id === payload.id);
      if (exists) return prev.map((x) => (x.id === payload.id ? payload : x));
      return [payload, ...prev];
    });

    alert("Job saved ✅");
  }

  function loadJob(id) {
    const j = jobs.find((x) => x.id === id);
    if (!j) return;

    setTab("jobs");
    setJobId(j.id);
    setSelectedCustomerId(j.customerId);
    setJobStartDate(j.startDate);
    setJobStartTime(j.startTime);
    setJobServicePlan(j.servicePlan || "One-time");
    setJobPests(Array.isArray(j.pests) ? j.pests : []);
    setJobNotes(j.notes || "");
    setJobSubtotalRaw(String(j.subtotal ?? ""));
    setJobChemRows(
      (j.chemicalsUsed || []).map((c) => ({
        rowId: uid(),
        chemicalId: c.chemicalId || "",
        amount: c.amount || "",
        unit: c.unit || "oz",
        ratio: c.ratio || "",
      })) || [{ rowId: uid(), chemicalId: chemicals[0]?.id || "", amount: "", unit: "oz", ratio: "" }]
    );
  }

  function deleteJob(id) {
    if (!confirm("Delete this job?")) return;
    setJobs((prev) => prev.filter((x) => x.id !== id));
    if (jobId === id) setJobId("");
  }

  function togglePest(p) {
    setJobPests((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function addChemRow() {
    setJobChemRows((prev) => [...prev, { rowId: uid(), chemicalId: chemicals[0]?.id || "", amount: "", unit: "oz", ratio: "" }]);
  }

  function updateChemRow(rowId, patch) {
    setJobChemRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function removeChemRow(rowId) {
    setJobChemRows((prev) => {
      const next = prev.filter((r) => r.rowId !== rowId);
      return next.length ? next : [{ rowId: uid(), chemicalId: chemicals[0]?.id || "", amount: "", unit: "oz", ratio: "" }];
    });
  }

  // Receipt + email (mailto)
  const currentCustomerForReceipt = selectedCustomer || { name: "", address: "", phone: "", email: "" };

  const receiptText = useMemo(() => {
    const customer = {
      name: currentCustomerForReceipt.name || "",
      address: currentCustomerForReceipt.address || "",
      phone: currentCustomerForReceipt.phone || "",
      email: currentCustomerForReceipt.email || "",
    };

    const job = {
      startDate: jobStartDate,
      startTime: jobStartTime,
      servicePlan: jobServicePlan,
      pests: jobPests,
      notes: jobNotes,
    };

    const chems = jobChemRows
      .map((r) => {
        const chem = chemicals.find((x) => x.id === r.chemicalId);
        return {
          chemicalName: chem?.name || "",
          epa: chem?.epa || "",
          amount: r.amount,
          unit: r.unit,
          ratio: r.ratio,
        };
      })
      .filter((c) => c.chemicalName || c.amount || c.ratio);

    return buildReceiptText({
      business,
      customer,
      job,
      totals: { subtotal, tax, total },
      chemicals: chems,
    });
  }, [
    business,
    currentCustomerForReceipt,
    jobStartDate,
    jobStartTime,
    jobServicePlan,
    jobPests,
    jobNotes,
    jobChemRows,
    chemicals,
    subtotal,
    tax,
    total,
  ]);

  const mailtoHref = useMemo(() => {
    const to = encodeURIComponent((currentCustomerForReceipt.email || "").trim());
    const subject = encodeURIComponent(`Receipt - New Day Pest Control - ${jobStartDate} ${jobStartTime}`);
    const body = encodeURIComponent(receiptText);
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [currentCustomerForReceipt.email, jobStartDate, jobStartTime, receiptText]);

  // Calendar computed
  const jobsByDate = useMemo(() => {
    const map = new Map();
    for (const j of jobs) {
      const d = j.startDate;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(j);
    }
    // sort each day by time
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      map.set(k, arr);
    }
    return map;
  }, [jobs]);

  const monthGrid = useMemo(() => {
    const first = new Date(calMonth.y, calMonth.m, 1);
    const startDay = first.getDay(); // 0=Sun
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const cells = [];

    // blanks before
    for (let i = 0; i < startDay; i++) cells.push({ kind: "blank", key: `b${i}` });

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calMonth.y, calMonth.m, d);
      const iso = toISODate(date);
      const count = jobsByDate.get(iso)?.length || 0;
      cells.push({ kind: "day", iso, dayNum: d, count, key: iso });
    }

    // pad to full weeks
    while (cells.length % 7 !== 0) cells.push({ kind: "blank", key: `t${cells.length}` });
    return cells;
  }, [calMonth, jobsByDate]);

  function prevMonth() {
    setCalMonth((p) => {
      const m = p.m - 1;
      if (m < 0) return { y: p.y - 1, m: 11 };
      return { y: p.y, m };
    });
  }

  function nextMonth() {
    setCalMonth((p) => {
      const m = p.m + 1;
      if (m > 11) return { y: p.y + 1, m: 0 };
      return { y: p.y, m };
    });
  }

  // UI Layout
  const pageTitle =
    tab === "customers"
      ? "Customers"
      : tab === "jobs"
      ? "Jobs"
      : tab === "calendar"
      ? "Calendar"
      : tab === "materials"
      ? "Materials"
      : tab === "contracts"
      ? "Contracts"
      : "Receipts";

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
            <div style={{ fontWeight: 950, fontSize: 13, color: "#0f7a2a" }}>MENU</div>
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
              onClick={() => setTab(item.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                background: tab === item.id ? "rgba(15, 122, 42, 0.10)" : "transparent",
                color: tab === item.id ? "#0f7a2a" : "#111827",
                fontWeight: 950,
                cursor: "pointer",
                borderLeft: tab === item.id ? "4px solid #0f7a2a" : "4px solid transparent",
              }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ padding: 14, borderTop: "1px solid rgba(0,0,0,0.06)", color: "#6b7280" }}>
            <div style={{ fontSize: 12, fontWeight: 900 }}>Data</div>
            <div style={{ fontSize: 12, marginTop: 6, fontWeight: 800 }}>Saved locally on this device</div>
          </div>
        </div>

        {/* Main area */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 14 }}>
          {/* Main panel */}
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              padding: 16,
            }}
          >
            {/* CUSTOMERS */}
            {tab === "customers" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Customer Database</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Add customers once. Jobs will auto-fill from here.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="outline" onClick={newCustomer}>
                      + New
                    </Btn>
                    <Btn onClick={saveCustomer}>Save</Btn>
                    <Btn variant="danger" onClick={deleteCustomer}>
                      Delete
                    </Btn>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Customer Name">
                    <Input
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Customer full name"
                    />
                  </Field>

                  <Field label="Phone Number">
                    <Input
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="(###) ###-####"
                    />
                  </Field>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Address">
                      <Input
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Street, City, NJ ZIP"
                      />
                    </Field>
                    {customerForm.address?.trim() ? (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={mapsUrl(customerForm.address)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 900, color: "#0f7a2a", textDecoration: "none" }}
                        >
                          Open in Google Maps →
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <Field label="Email">
                      <Input
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="customer@email.com"
                      />
                    </Field>
                  </div>

                  <Field label="Service Plan">
                    <Select
                      value={customerForm.plan}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, plan: e.target.value }))}
                    >
                      {SERVICE_PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
                    <Btn onClick={() => startNewJob(customerForm.id || selectedCustomerId || "")}>
                      Create Job for this Customer
                    </Btn>
                  </div>
                </div>
              </>
            )}

            {/* JOBS */}
            {tab === "jobs" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Job / Receipt</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Pick a customer → auto-fills from database.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="outline" onClick={() => startNewJob(selectedCustomerId)}>
                      + New Job
                    </Btn>
                    <Btn onClick={saveJob}>Save Job</Btn>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                  <Field label="Customer">
                    <Select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                      }}
                    >
                      <option value="">Select customer…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || "Untitled"} • {c.phone || ""}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Service Plan">
                    <Select value={jobServicePlan} onChange={(e) => setJobServicePlan(e.target.value)}>
                      {SERVICE_PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Date">
                    <Input type="date" value={jobStartDate} onChange={(e) => setJobStartDate(e.target.value)} />
                  </Field>

                  <Field label="Time">
                    <Input type="time" value={jobStartTime} onChange={(e) => setJobStartTime(e.target.value)} />
                  </Field>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 950 }}>Customer Auto-Fill</div>
                      {selectedCustomer?.address ? (
                        <a
                          href={mapsUrl(selectedCustomer.address)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 950, color: "#0f7a2a", textDecoration: "none", fontSize: 12 }}
                        >
                          Open Address in Google Maps →
                        </a>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        padding: 10,
                        background: "#fbfcfe",
                        fontWeight: 800,
                        color: "#374151",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      <div><b>Name:</b> {selectedCustomer?.name || "—"}</div>
                      <div><b>Phone:</b> {selectedCustomer?.phone || "—"}</div>
                      <div><b>Email:</b> {selectedCustomer?.email || "—"}</div>
                      <div><b>Address:</b> {selectedCustomer?.address || "—"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ height: 14 }} />

                {/* Pests */}
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
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Select all that apply</div>
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PEST_TYPES.map((p) => {
                      const on = jobPests.includes(p);
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
                            fontWeight: 950,
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
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        Multiple chemicals per job • amount used • mix ratio • editable
                      </div>
                    </div>

                    <Btn variant="outline" onClick={addChemRow}>
                      + Add Chemical
                    </Btn>
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={{ display: "grid", gap: 10 }}>
                    {jobChemRows.map((r) => (
                      <div
                        key={r.rowId}
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
                            value={r.chemicalId}
                            onChange={(e) => updateChemRow(r.rowId, { chemicalId: e.target.value })}
                          >
                            {chemicals.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}{c.epa ? ` (EPA ${c.epa})` : ""}
                              </option>
                            ))}
                          </Select>
                        </Field>

                        <Field label="Amount Used">
                          <Input
                            value={r.amount}
                            onChange={(e) => updateChemRow(r.rowId, { amount: e.target.value })}
                            placeholder="e.g. 2.5"
                            inputMode="decimal"
                          />
                        </Field>

                        <Field label="Unit">
                          <Select
                            value={r.unit}
                            onChange={(e) => updateChemRow(r.rowId, { unit: e.target.value })}
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
                            value={r.ratio}
                            onChange={(e) => updateChemRow(r.rowId, { ratio: e.target.value })}
                            placeholder='e.g. "1 oz / 1 gal"'
                          />
                        </Field>

                        <button
                          onClick={() => removeChemRow(r.rowId)}
                          style={{
                            height: 38,
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "white",
                            fontWeight: 950,
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
                    <Textarea value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="Areas treated, findings, etc." />
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
                    <div style={{ fontWeight: 950 }}>Billing</div>

                    <Field label="Amount Charged (Subtotal)">
                      <Input
                        value={jobSubtotalRaw}
                        onChange={(e) => setJobSubtotalRaw(e.target.value)}
                        placeholder="e.g. 149.00"
                        inputMode="decimal"
                      />
                    </Field>

                    <div style={{ display: "grid", gap: 8, fontWeight: 900 }}>
                      <Row label="NJ Tax (6.625%)" value={money(tax)} />
                      <div style={{ height: 1, background: "rgba(0,0,0,0.10)" }} />
                      <Row label="Total" value={money(total)} strong />
                    </div>

                    <div style={{ height: 6 }} />

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
                          fontWeight: 950,
                          border: "1px solid rgba(0,0,0,0.08)",
                          opacity: (currentCustomerForReceipt.email || "").trim() ? 1 : 0.55,
                        }}
                        onClick={(e) => {
                          if (!(currentCustomerForReceipt.email || "").trim()) {
                            e.preventDefault();
                            alert("Add the customer email first, then click Email Receipt.");
                          }
                        }}
                        title="Opens your email app with the receipt filled in"
                      >
                        Email Receipt
                      </a>

                      <Btn
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(receiptText);
                            alert("Receipt copied ✅");
                          } catch {
                            alert("Copy failed. You can select and copy manually.");
                          }
                        }}
                      >
                        Copy Receipt
                      </Btn>
                    </div>

                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Email uses your email app (mailto). Later we can add real sending from the app.
                    </div>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 900, color: "#0f7a2a" }}>Receipt Preview</summary>
                  <pre
                    style={{
                      marginTop: 10,
                      whiteSpace: "pre-wrap",
                      background: "#fff",
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 12,
                      padding: 12,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                      fontSize: 12,
                    }}
                  >
                    {receiptText}
                  </pre>
                </details>
              </>
            )}

            {/* CALENDAR */}
            {tab === "calendar" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Calendar</div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Month view + scheduled jobs. Click a day to see the schedule.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Btn variant="outline" onClick={prevMonth}>◀</Btn>
                    <Pill>
                      {new Date(calMonth.y, calMonth.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </Pill>
                    <Btn variant="outline" onClick={nextMonth}>▶</Btn>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                {/* Month grid */}
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "rgba(15, 122, 42, 0.10)" }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} style={{ padding: 10, fontWeight: 950, color: "#0f7a2a", fontSize: 12 }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {monthGrid.map((cell) => {
                      if (cell.kind === "blank") {
                        return <div key={cell.key} style={{ height: 92, borderTop: "1px solid rgba(0,0,0,0.06)" }} />;
                      }

                      const selected = cell.iso === calSelectedDate;
                      return (
                        <button
                          key={cell.key}
                          onClick={() => setCalSelectedDate(cell.iso)}
                          style={{
                            height: 92,
                            border: "none",
                            borderTop: "1px solid rgba(0,0,0,0.06)",
                            borderRight: "1px solid rgba(0,0,0,0.06)",
                            textAlign: "left",
                            padding: 10,
                            background: selected ? "rgba(15, 122, 42, 0.10)" : "white",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 950 }}>{cell.dayNum}</div>
                            {cell.count ? <Pill>{cell.count}</Pill> : null}
                          </div>
                          {cell.count ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                              Scheduled jobs
                            </div>
                          ) : (
                            <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af", fontWeight: 800 }}>
                              —
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 12 }} />

                {/* Day schedule */}
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fbfcfe",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      {/* Bold date requested */}
                      <div style={{ fontSize: 16, fontWeight: 950 }}>
                        {formatNiceDate(calSelectedDate)}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        Click a job to open it in Jobs.
                      </div>
                    </div>

                    <Btn
                      onClick={() => {
                        // quick schedule: jump to Jobs with date/time preset
                        setTab("jobs");
                        setJobId("");
                        setJobStartDate(calSelectedDate);
                        setJobStartTime("09:00");
                        setJobPests([]);
                        setJobNotes("");
                        setJobSubtotalRaw("");
                        setJobChemRows([{ rowId: uid(), chemicalId: chemicals[0]?.id || "", amount: "", unit: "oz", ratio: "" }]);
                      }}
                    >
                      + Schedule Job
                    </Btn>
                  </div>

                  <div style={{ height: 10 }} />

                  {(() => {
                    const dayJobs = jobsByDate.get(calSelectedDate) || [];
                    if (!dayJobs.length) {
                      return <div style={{ color: "#6b7280", fontWeight: 900 }}>No jobs scheduled.</div>;
                    }
                    return (
                      <div style={{ display: "grid", gap: 10 }}>
                        {dayJobs.map((j) => {
                          const snap = j.customerSnapshot || {};
                          const addr = snap.address || "";
                          return (
                            <div
                              key={j.id}
                              style={{
                                background: "white",
                                border: "1px solid rgba(0,0,0,0.08)",
                                borderRadius: 12,
                                padding: 12,
                                display: "grid",
                                gridTemplateColumns: "0.25fr 1fr",
                                gap: 12,
                                alignItems: "start",
                              }}
                            >
                              <div style={{ fontWeight: 950, color: "#0f7a2a" }}>
                                {j.startTime || "—"}
                              </div>
                              <div>
                                <div style={{ fontWeight: 950 }}>{snap.name || "Customer"}</div>
                                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                                  {snap.phone ? `📞 ${snap.phone}` : ""}
                                  {snap.phone && (j.pests || []).length ? " • " : ""}
                                  {(j.pests || []).slice(0, 3).join(", ")}
                                  {(j.pests || []).length > 3 ? "…" : ""}
                                </div>

                                {/* Address + Google Maps link requested */}
                                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#374151" }}>
                                  {addr ? (
                                    <>
                                      <span>{addr}</span>{" "}
                                      <a
                                        href={mapsUrl(addr)}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: "#0f7a2a", textDecoration: "none", fontWeight: 950 }}
                                      >
                                        (Map)
                                      </a>
                                    </>
                                  ) : (
                                    <span style={{ color: "#9ca3af" }}>No address</span>
                                  )}
                                </div>

                                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                  <Btn
                                    variant="outline"
                                    onClick={() => loadJob(j.id)}
                                  >
                                    Open
                                  </Btn>
                                  <Btn variant="danger" onClick={() => deleteJob(j.id)}>
                                    Delete
                                  </Btn>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Other tabs placeholder (not empty “broken”, just not built yet) */}
            {["materials", "contracts", "receipts"].includes(tab) && (
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 950 }}>{pageTitle}</div>
                <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 800 }}>
                  Coming next. Calendar + Jobs + Customers are the priority screens.
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Lists */}
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              minHeight: 520,
              gap: 12,
            }}
          >
            {/* Customers list */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 950 }}>Customers</div>
                <Pill>{customers.length}</Pill>
              </div>

              <div style={{ marginTop: 10, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
                {customers.length === 0 ? (
                  <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
                    No customers yet. Add one in Customers tab.
                  </div>
                ) : (
                  customers.slice(0, 12).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        loadCustomer(c.id);
                        setTab("customers");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        border: "none",
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        background: c.id === selectedCustomerId ? "rgba(15, 122, 42, 0.08)" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>{c.name || "Untitled"}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        {c.phone || ""}{c.phone && c.plan ? " • " : ""}{c.plan || ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Jobs list */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 950 }}>Jobs</div>
                <Pill>{jobs.length}</Pill>
              </div>

              <div style={{ marginTop: 10, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
                {jobs.length === 0 ? (
                  <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
                    No jobs yet. Create one in Jobs tab.
                  </div>
                ) : (
                  jobs.slice(0, 12).map((j) => {
                    const snap = j.customerSnapshot || {};
                    return (
                      <button
                        key={j.id}
                        onClick={() => loadJob(j.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 12,
                          border: "none",
                          borderTop: "1px solid rgba(0,0,0,0.06)",
                          background: "white",
                          cursor: "pointer",
                        }}
                      >
                        {/* Bold date requested — visible in list */}
                        <div style={{ fontWeight: 950 }}>
                          {j.startDate} {j.startTime}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                          {snap.name || "Customer"} • {money(j.total || 0)}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Manage chemicals quick editor */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
              <div style={{ fontWeight: 950 }}>Chemicals List</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                Edit here later if needed (we can add full manager next).
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {chemicals.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 12,
                      padding: 10,
                      background: "#fbfcfe",
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      {c.name}
                      {c.epa ? <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>EPA {c.epa}</div> : null}
                    </div>
                    <button
                      onClick={() => {
                        const newName = prompt("Chemical name:", c.name);
                        if (newName === null) return;
                        const newEpa = prompt("EPA (optional):", c.epa || "");
                        if (newEpa === null) return;
                        setChemicals((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: newName.trim() || x.name, epa: (newEpa || "").trim() } : x)));
                      }}
                      style={{
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "white",
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}

                <Btn
                  variant="outline"
                  onClick={() => {
                    const name = prompt("New chemical name:");
                    if (!name) return;
                    const epa = prompt("EPA (optional):") || "";
                    setChemicals((prev) => [...prev, { id: uid(), name: name.trim(), epa: epa.trim() }]);
                  }}
                >
                  + Add Chemical
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Small footer tip */}
      <div style={{ padding: 14, color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
        Tip: Calendar shows future jobs automatically after you Save Jobs. Click a date → schedule.
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontWeight: strong ? 950 : 900, color: "#374151" }}>{label}</div>
      <div style={{ fontWeight: strong ? 950 : 900 }}>{value}</div>
    </div>
  );
}
