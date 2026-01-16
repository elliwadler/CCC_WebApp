import React, { useEffect, useState } from "react";

export default function App() {
  const [form, setForm] = useState({
    "Time_Duration(min)": "",

    "Start_Lat": "",
    "Start_Lng": "",

    "Temperature(F)": "",
    "Humidity(%)": "",
    "Visibility(mi)": "",
    "Wind_Speed(mph)": "",
    "Pressure(in)": "",
    "Weather_Condition": "",

    "Crossing": false,
    "Give_Way": false,
    "Junction": false,
    "No_Exit": false,
    "Railway": false,
    "Roundabout": false,
    "Stop": false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState(null);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // 📍 Default: current location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      update("Start_Lat", pos.coords.latitude.toFixed(6));
      update("Start_Lng", pos.coords.longitude.toFixed(6));
    });
  }, []);

  // 🌦 Auto-fill weather
  async function autofillWeather() {
    setLoading(true);
    setError("");

    try {
      const lat = form["Start_Lat"];
      const lng = form["Start_Lng"];

      if (!lat || !lng) {
        throw new Error("Location missing");
      }

      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${lat}&longitude=${lng}` +
        "&current=temperature_2m,relative_humidity_2m,visibility,wind_speed_10m,pressure_msl,weathercode";

      const res = await fetch(url);
      const data = await res.json();
      const c = data.current;

      setForm(prev => ({
        ...prev,
        "Temperature(F)": (c.temperature_2m * 9 / 5 + 32).toFixed(1),
        "Humidity(%)": c.relative_humidity_2m,
        "Visibility(mi)": (c.visibility / 1609).toFixed(2),
        "Wind_Speed(mph)": (c.wind_speed_10m / 1.609).toFixed(1),
        "Pressure(in)": (c.pressure_msl * 0.02953).toFixed(2),
        "Weather_Condition": mapWeatherCode(c.weathercode)
      }));
    } catch (e) {
      setError(e.message || "Weather lookup failed");
    } finally {
      setLoading(false);
    }
  }

  // 🤖 Send to AI
  async function submitToAI() {
    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const result = await response.json();
      setPrediction(result);

    } catch (e) {
      setError(e.message || "Failed to reach AI API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚗 Accident Severity Prediction</h1>

        <Section title="⏱ Time">
          <Input
            label="Duration (minutes)"
            value={form["Time_Duration(min)"]}
            onChange={v => update("Time_Duration(min)", v)}
          />
        </Section>

        <Section title="📍 Location">
          <Grid>
            <Input label="Latitude"
              value={form["Start_Lat"]}
              onChange={v => update("Start_Lat", v)} />
            <Input label="Longitude"
              value={form["Start_Lng"]}
              onChange={v => update("Start_Lng", v)} />
          </Grid>
        </Section>

        <Section title="🌦 Weather">
          <Grid>
            <Input label="Temperature (°F)" value={form["Temperature(F)"]}
              onChange={v => update("Temperature(F)", v)} />
            <Input label="Humidity (%)" value={form["Humidity(%)"]}
              onChange={v => update("Humidity(%)", v)} />
            <Input label="Visibility (mi)" value={form["Visibility(mi)"]}
              onChange={v => update("Visibility(mi)", v)} />
            <Input label="Wind Speed (mph)" value={form["Wind_Speed(mph)"]}
              onChange={v => update("Wind_Speed(mph)", v)} />
            <Input label="Pressure (in)" value={form["Pressure(in)"]}
              onChange={v => update("Pressure(in)", v)} />
            <Select label="Weather Condition"
              value={form["Weather_Condition"]}
              onChange={v => update("Weather_Condition", v)}
              options={[
                "Clear", "Cloudy", "Rain", "Snow",
                "Fog", "Thunderstorm", "Drizzle"
              ]}
            />
          </Grid>

          <button style={styles.button} onClick={autofillWeather} disabled={loading}>
            {loading ? "Fetching weather…" : "Auto-fill weather"}
          </button>
        </Section>

        <Section title="🚦 Road Features">
          <Grid>
            {["Crossing","Give_Way","Junction","No_Exit","Railway","Roundabout","Stop"]
              .map(k => (
                <Checkbox key={k} label={k.replace("_"," ")}
                  value={form[k]} onChange={v => update(k, v)} />
              ))}
          </Grid>
        </Section>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} onClick={submitToAI} disabled={loading}>
          {loading ? "Predicting severity…" : "Predict Severity via AI"}
        </button>

        {prediction && (
          <Section title="🧠 Prediction Result">
            <div style={{
              padding: "1rem",
              borderRadius: "10px",
              background: severityColor(prediction.severity),
              color: "#fff"
            }}>
              <h3>Predicted Severity: {prediction.severity}</h3>
              <p>{severityExplanation(prediction.severity)}</p>
            </div>
          </Section>
        )}

        <pre style={styles.preview}>
          {JSON.stringify(form, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({ title, children }) {
  return <div style={styles.section}><h2>{title}</h2>{children}</div>;
}
function Grid({ children }) {
  return <div style={styles.grid}>{children}</div>;
}
function Input({ label, value, onChange }) {
  return (
    <label style={styles.label}>
      {label}
      <input style={styles.input} value={value}
        onChange={e => onChange(e.target.value)} />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label style={styles.label}>
      {label}
      <select style={styles.input} value={value}
        onChange={e => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
function Checkbox({ label, value, onChange }) {
  return (
    <label style={styles.checkbox}>
      <input type="checkbox" checked={value}
        onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function mapWeatherCode(code) {
  if (code === 0) return "Clear";
  if ([1,2,3].includes(code)) return "Cloudy";
  if ([45,48].includes(code)) return "Fog";
  if ([51,53,55,61,63,65].includes(code)) return "Rain";
  if ([71,73,75].includes(code)) return "Snow";
  if ([95,96,99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function severityExplanation(s) {
  return [
    "Minor accident. Low impact.",
    "Moderate accident. Possible injuries.",
    "Severe accident. High injury risk.",
    "Very severe accident. Critical."
  ][s - 1] || "Unknown severity";
}
function severityColor(s) {
  return ["#2ecc71","#f1c40f","#e67e22","#e74c3c"][s - 1] || "#7f8c8d";
}

const styles = {
  page:{minHeight:"100vh",background:"linear-gradient(135deg,#667eea,#764ba2)",padding:"2rem"},
  card:{background:"#fff",padding:"2rem",borderRadius:"16px",maxWidth:"720px",margin:"auto"},
  section:{marginTop:"1.5rem"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"},
  label:{display:"flex",flexDirection:"column",fontSize:"0.85rem"},
  input:{padding:"0.6rem",borderRadius:"8px",border:"1px solid #ccc"},
  checkbox:{display:"flex",gap:"0.5rem"},
  button:{marginTop:"1rem",padding:"0.7rem",borderRadius:"8px",border:"none",background:"#667eea",color:"#fff"},
  error:{color:"crimson"},
  preview:{marginTop:"2rem",background:"#f7f7f7",padding:"1rem",borderRadius:"8px",fontSize:"0.8rem"}
};
