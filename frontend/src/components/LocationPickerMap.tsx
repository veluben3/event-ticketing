import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const center = useMemo(() => [latitude, longitude] as [number, number], [latitude, longitude]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-[320px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Marker position={center} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
