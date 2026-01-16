import React, { useEffect, useState } from "react";

/* ---------- encoders & helpers ---------- */

const WEATHER_ENCODING = {
  Clear: 0,
  Cloudy: 1,
  Rain: 2,
  Snow: 3,
  Fog: 4,
  Thunderstorm: 5,
  Drizzle: 6,
  Unknown: 0
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function App() {
  const [form, setForm] = useState({
    DateTime: new Date().toISOString().slice(0, 16),
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

  /* ---------- location ---------- */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      update("Start_Lat", pos.coords.latitude.toFixed(6));
      update("Start_Lng", pos.coords.longitude.toFixed(6));
    });
  }, []);

  /* ---------- weather ---------- */
  async function autofillWeather() {
    setLoading(true);
    setError("");

    try {
      const lat = form["Start_Lat"];
      const lng = form["Start_Lng"];
      if (!lat || !lng) throw new Error("Location missing");

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

  /* ---------- AI submit ---------- */
  async function submitToAI() {
    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const now = new Date(form.DateTime || Date.now());

      const payload = {
        input_data: [
          {
            "Start_Lat": num(form["Start_Lat"]),
            "Start_Lng": num(form["Start_Lng"]),
            "Distance(mi)": 0,

            "Temperature(F)": num(form["Temperature(F)"]),
            "Humidity(%)": num(form["Humidity(%)"]),
            "Visibility(mi)": num(form["Visibility(mi)"]),
            "Wind_Speed(mph)": num(form["Wind_Speed(mph)"]),
            "Pressure(in)": num(form["Pressure(in)"]),
            "Wind_Chill(F)": num(form["Temperature(F)"]),
            "Precipitation(in)": 0,

            "Weather_Condition": WEATHER_ENCODING[form["Weather_Condition"]] ?? 0,
            "Wind_Direction": 0,
            "Sunrise_Sunset": now.getHours() >= 6 && now.getHours() < 18 ? 1 : 0,
            "Civil_Twilight": 1,
            "Nautical_Twilight": 1,
            "Astronomical_Twilight": 1,

            "Year": now.getFullYear(),
            "Month": now.getMonth() + 1,
            "Day": now.getDate(),
            "Hour": now.getHours(),
            "Weekday": now.getDay(),
            "Duration_Minutes": num(form["Time_Duration(min)"]),

            "Airport_Code": 0,
            "City": 0,
            "County": 0,
            "State": 0,
            "Zipcode": 0,
            "Country": 0,
            "Timezone": 0,
            "Station": 0,
            "Weather_Timestamp": 0,

            "Crossing": form.Crossing,
            "Give_Way": form.Give_Way,
            "Junction": form.Junction,
            "No_Exit": form.No_Exit,
            "Railway": form.Railway,
            "Roundabout": form.Roundabout,
            "Stop": form.Stop,
            "Traffic_Signal": false,
            "Amenity": false,
            "Bump": false,
            "Turning_Loop": false,
            "Traffic_Calming": false
          }
        ]
      };

      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("AI request failed");

      const result = await response.json();
      const severity = result.predictions?.[0];
      if (severity === undefined) throw new Error("Invalid AI response");

      setPrediction({ severity });
    } catch (e) {
      setError(e.message || "Failed to reach AI API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Accident Severity Prediction</h1>
        <p style={styles.subtitle}>AI-powered traffic risk assessment</p>

        <Section title="Date & Time">
          <Input type="datetime-local"
            label="Accident date & time"
            value={form.DateTime}
            onChange={v => update("DateTime", v)} />
        </Section>

        <Section title="Duration">
          <Input label="Duration (minutes)"
            value={form["Time_Duration(min)"]}
            onChange={v => update("Time_Duration(min)", v)} />
        </Section>

        <Section title="Location">
          <Grid>
            <Input label="Latitude" value={form["Start_Lat"]}
              onChange={v => update("Start_Lat", v)} />
            <Input label="Longitude" value={form["Start_Lng"]}
              onChange={v => update("Start_Lng", v)} />
          </Grid>
        </Section>

        <Section title="Weather">
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
              options={Object.keys(WEATHER_ENCODING)} />
          </Grid>

          <button style={styles.secondaryButton}
            onClick={autofillWeather} disabled={loading}>
            Auto-fill weather
          </button>
        </Section>

        <Section title="Road Features">
          <Grid>
            {["Crossing","Give_Way","Junction","No_Exit","Railway","Roundabout","Stop"]
              .map(k => (
                <Checkbox key={k}
                  label={k.replace("_"," ")}
                  value={form[k]}
                  onChange={v => update(k, v)} />
              ))}
          </Grid>
        </Section>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.primaryButton}
          onClick={submitToAI} disabled={loading}>
          {loading ? "Analyzing…" : "Predict Severity"}
        </button>

        {prediction && (
          <div style={{
            marginTop: "2rem",
            padding: "1.25rem",
            borderRadius: "14px",
            background: severityColor(prediction.severity),
            color: "#fff"
          }}>
            <h3 style={{ margin: 0 }}>Severity: {prediction.severity}</h3>
            <p style={{ marginTop: "0.5rem" }}>
              {severityExplanation(prediction.severity)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}
function Grid({ children }) {
  return <div style={styles.grid}>{children}</div>;
}
function Input({ label, value, onChange, type = "text" }) {
  return (
    <label style={styles.label}>
      <span>{label}</span>
      <input
        type={type}
        style={styles.input}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label style={styles.label}>
      <span>{label}</span>
      <select style={styles.input}
        value={value}
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
      <input type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/* ---------- misc ---------- */

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
  return ["#bfecd0","#fde68a","#fdba74","#fca5a5"][s - 1] || "#cbd5e1";
}

const styles = {
  headingFont: {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  page: {
    minHeight: "100vh",
    background: "#aacef0",
    padding: "2rem",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "2.5rem",
    maxWidth: "760px",
    margin: "auto",
    boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  title: {
    margin: 0,
    fontSize: "1.9rem",
    fontWeight: 700,
    color: "#334155",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  subtitle: {
    marginTop: "0.3rem",
    color: "#64748b",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  section: {
    marginTop: "2rem"
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "#475569",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "1rem"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    fontSize: "0.8rem",
    gap: "0.25rem",
    color: "#475569",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  input: {
    padding: "0.65rem 0.7rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "0.9rem",
    background: "#f8fafc"
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    color: "#475569",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"
  },
  primaryButton: {
    marginTop: "2rem",
    width: "100%",
    padding: "0.85rem",
    borderRadius: "12px",
    border: "none",
    background: "#c7d2fe",
    color: "#1e293b",
    fontWeight: 600,
    cursor: "pointer"
  },
  secondaryButton: {
    marginTop: "1rem",
    padding: "0.6rem 1.1rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f1f5f9",
    cursor: "pointer"
  },
  error: {
    marginTop: "1rem",
    color: "#ef4444",
    fontSize: "0.85rem"
  }
};
