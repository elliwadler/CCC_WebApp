import React from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* Fix default marker icon (important for React + Leaflet) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapPicker({ lat, lng, onSelect }) {
  const center = lat && lng ? [lat, lng] : [39.5, -98.35]; // USA center

  return (
    <MapContainer
      center={center}
      zoom={4}
      style={{ height: "320px", width: "100%", borderRadius: "12px" }}
      maxBounds={[
        [5, -170],   // South-West (Mexico / Pacific)
        [75, -50]    // North-East (Canada / Atlantic)
      ]}
      maxBoundsViscosity={1.0}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onSelect={onSelect} />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
