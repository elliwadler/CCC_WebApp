import React, { useEffect, useState } from "react";

export default function App() {
  /*async function submitToAI() {
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
      throw new Error("API request failed");
    }

    const result = await response.json();

    // Example expected result: { severity: 1 | 2 | 3 | 4 }
    setPrediction(result);

  } catch (e) {
    setError(e.message || "Failed to reach AI API");
  } finally {
    setLoading(false);
  }
}
*/
  const [form, setForm] = useState({
    // time
    date: "",
    time: "",
    duration: "",

    // location
    latitude: "",
    longitude: "",

    // weather
    temperature: "",
    humidity: "",
    visibility: "",
    windSpeed: "",
    pressure: "",
    weatherCondition: "",

    // road features
    crossing: false,
    give_way: false,
    junction: false,
    no_exit: false,
    railway: false,
    roundabout: false,
    stop: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState(null);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // 📍 Get current location on load
  useEffect(() => {
    const now = new Date();

    // format date: YYYY-MM-DD
    const date = now.toISOString().split("T")[0];

    // format time: HH:MM
    const time = now.toTimeString().slice(0, 5);

    update("date", date);
    update("time", time);

    navigator.geolocation.getCurrentPosition(pos => {
      update("latitude", pos.coords.latitude.toFixed(6));
      update("longitude", pos.coords.longitude.toFixed(6));
    });
  }, []);

  async function autofillWeather() {
    setLoading(true);
    setError("");

    try {
      if (!form.date || !form.time) {
        throw new Error("Please select date and time first");
      }

      const selectedDateTime = new Date(`${form.date}T${form.time}`);
      const day = selectedDateTime.toISOString().split("T")[0];
      const targetHour = selectedDateTime.getHours();

      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${form.latitude}&longitude=${form.longitude}` +
        `&hourly=temperature_2m,relative_humidity_2m,visibility,wind_speed_10m,pressure_msl,weathercode` +
        `&start_date=${day}&end_date=${day}` +
        `&timezone=auto`;

      const res = await fetch(url);
      const data = await res.json();

      const index = data.hourly.time.findIndex(
        t => new Date(t).getHours() === targetHour
      );

      if (index === -1) {
        throw new Error("No weather data for selected time");
      }

      setForm(prev => ({
        ...prev,
        temperature: data.hourly.temperature_2m[index],
        humidity: data.hourly.relative_humidity_2m[index],
        visibility: data.hourly.visibility[index],
        windSpeed: data.hourly.wind_speed_10m[index],
        pressure: (data.hourly.pressure_msl[index] * 0.02953).toFixed(2), // hPa → inHg
        weatherCondition: mapWeatherCode(data.hourly.weathercode[index])
      }));
    } catch (e) {
      setError(e.message || "Weather lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Car Accident Severity Prediction Input</h1>

        {/* TIME */}
        <Section title="⏱ Time">
          <Grid>
            <Input label="Date" type="date"
              value={form.date} onChange={v => update("date", v)} />
            <Input label="Time" type="time"
              value={form.time} onChange={v => update("time", v)} />
            <Input label="Duration (minutes)"
              value={form.duration} onChange={v => update("duration", v)} />
          </Grid>
        </Section>

        {/* LOCATION */}
        <Section title="📍 Location">
          <Grid>
            <Input label="Latitude"
              value={form.latitude} onChange={v => update("latitude", v)} />
            <Input label="Longitude"
              value={form.longitude} onChange={v => update("longitude", v)} />
          </Grid>
        </Section>

        {/* WEATHER */}
        <Section title="🌦 Weather">
          <Grid>
            <Input label="Temperature (°C)" value={form.temperature}
              onChange={v => update("temperature", v)} />
            <Input label="Humidity (%)" value={form.humidity}
              onChange={v => update("humidity", v)} />
            <Input label="Visibility (m)" value={form.visibility}
              onChange={v => update("visibility", v)} />
            <Input label="Wind Speed (km/h)" value={form.windSpeed}
              onChange={v => update("windSpeed", v)} />
            <Input label="Pressure (inHg)" value={form.pressure}
              onChange={v => update("pressure", v)} />
            <Select label="Weather Condition"
              value={form.weatherCondition}
              onChange={v => update("weatherCondition", v)}
              options={[
                "Clear", "Cloudy", "Rain", "Snow",
                "Fog", "Thunderstorm", "Drizzle"
              ]}
            />
          </Grid>

          <button
            style={styles.button}
            onClick={autofillWeather}
            disabled={loading || !form.date || !form.time}
          >
            {loading ? "Fetching weather…" : "Auto-fill weather"}
          </button>
        </Section>

        {/* ROAD FEATURES */}
        <Section title="🚦 Road Features">
          <Grid>
            <Checkbox label="Crossing" value={form.crossing}
              onChange={v => update("crossing", v)} />
            <Checkbox label="Give Way" value={form.give_way}
              onChange={v => update("give_way", v)} />
            <Checkbox label="Junction" value={form.junction}
              onChange={v => update("junction", v)} />
            <Checkbox label="No Exit" value={form.no_exit}
              onChange={v => update("no_exit", v)} />
            <Checkbox label="Railway" value={form.railway}
              onChange={v => update("railway", v)} />
            <Checkbox label="Roundabout" value={form.roundabout}
              onChange={v => update("roundabout", v)} />
            <Checkbox label="Stop" value={form.stop}
              onChange={v => update("stop", v)} />
          </Grid>
        </Section>

        {error && <p style={styles.error}>{error}</p>}

        <pre style={styles.preview}>
          {JSON.stringify(form, null, 2)}
        </pre>

        <button
          style={styles.button}
          //onClick={submitToAI}
          disabled={loading}
        >
          {loading ? "Predicting severity..." : "Predict Severity via AI"}
        </button>

        {prediction && (
          <Section title="🧠 Prediction Result">
            <div style={{
              padding: "1rem",
              borderRadius: "10px",
              background: severityColor(prediction.severity),
              color: "#fff"
            }}>
              <h3 style={{ marginTop: 0 }}>
                Predicted Severity: {prediction.severity}
              </h3>
              <p>{severityExplanation(prediction.severity)}</p>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ---------- Helper components ---------- */

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
      {label}
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
      {label}
      <select
        style={styles.input}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, value, onChange }) {
  return (
    <label style={styles.checkbox}>
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/* ---------- Weather mapping ---------- */

function mapWeatherCode(code) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "Rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

/* ---------- Styles ---------- */

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    justifyContent: "center",
    padding: "2rem",
    fontFamily: "system-ui, sans-serif"
  },
  card: {
    background: "#fff",
    padding: "2.5rem",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "700px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
  },
  title: {
    marginTop: 0
  },
  section: {
    marginTop: "1.5rem"
  },
  sectionTitle: {
    marginBottom: "0.5rem"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    fontSize: "0.85rem"
  },
  input: {
    marginTop: "0.3rem",
    padding: "0.6rem",
    borderRadius: "8px",
    border: "1px solid #ccc"
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  button: {
    marginTop: "1rem",
    padding: "0.7rem",
    borderRadius: "8px",
    border: "none",
    background: "#667eea",
    color: "#fff",
    cursor: "pointer"
  },
  error: {
    color: "crimson",
    marginTop: "1rem"
  },
  preview: {
    marginTop: "2rem",
    background: "#f7f7f7",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.8rem"
  }
};
