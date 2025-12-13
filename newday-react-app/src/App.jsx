import { useState } from "react";

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function addCustomer(e) {
    e.preventDefault();
    if (!name || !phone) return;

    setCustomers([...customers, { name, phone }]);
    setName("");
    setPhone("");
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Customers</h1>

      <form onSubmit={addCustomer} style={{ marginBottom: "20px" }}>
        <input
          placeholder="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {" "}
        <input
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {" "}
        <button>Add</button>
      </form>

      <ul>
        {customers.map((c, i) => (
          <li key={i}>
            {c.name} — {c.phone}
          </li>
        ))}
      </ul>
    </div>
  );
}
