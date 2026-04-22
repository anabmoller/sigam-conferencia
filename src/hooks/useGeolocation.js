import { useEffect, useState } from 'react';

// Map GeolocationPositionError.code to a stable string so consumers can
// discriminate "user denied" from "no fix yet" / "hardware timeout".
const CODE_MAP = {
  1: 'PERMISSION_DENIED',
  2: 'POSITION_UNAVAILABLE',
  3: 'TIMEOUT',
};

function normalizeError(err) {
  if (!err) return null;
  if (typeof err === 'string') return { code: 'UNKNOWN', message: err };
  const code = CODE_MAP[err.code] ?? 'UNKNOWN';
  const message = err.message ?? code;
  return { code, message };
}

export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError({ code: 'UNAVAILABLE', message: 'Geolocalización no disponible' });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setError(null);
      },
      (err) => setError(normalizeError(err)),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { coords, error };
}
