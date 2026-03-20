import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState([]);
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    fetch("/api/antam")
      .then(res => res.json())
      .then(res => {
        setData(res.data || []);
        setUpdated(res.updated);
      });
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>📊 Monitoring Harga Emas Antam</h1>
      <p>Update: {new Date(updated).toLocaleString()}</p>

      {/* 🔥 AREA ADS */}
      <div style={{
        margin: "20px 0",
        padding: "20px",
        background: "#f5f5f5",
        textAlign: "center"
      }}>
        <p>🔥 Slot Iklan (Google AdSense)</p>
      </div>

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Berat</th>
            <th>Harga</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i}>
              <td>{item.berat}</td>
              <td>{item.harga}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔥 ADS BOTTOM */}
      <div style={{
        marginTop: 30,
        padding: 20,
        background: "#eee",
        textAlign: "center"
      }}>
        <p>Banner Iklan Bawah</p>
      </div>
    </div>
  );
}