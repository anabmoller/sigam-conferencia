import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export function QRScanner({ onDecode, onError }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [status, setStatus] = useState('starting');

  useEffect(() => {
    let cancelled = false;

    const listDevices = async () => {
      try {
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(list);
        const back = list.find((d) => /back|rear|environment/i.test(d.label)) || list[0];
        setDeviceId(back?.deviceId ?? null);
      } catch (err) {
        onError?.(err);
      }
    };
    listDevices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!deviceId || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setStatus('running');

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, err, controls) => {
        if (controls && !controlsRef.current) controlsRef.current = controls;
        if (result) {
          onDecode?.(result.getText());
        }
      })
      .catch((err) => {
        setStatus('error');
        onError?.(err);
      });

    return () => {
      try {
        controlsRef.current?.stop();
      } catch {
        /* noop */
      }
      controlsRef.current = null;
    };
  }, [deviceId, onDecode, onError]);

  return (
    <div className="space-y-3">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <div className="absolute inset-6 border-2 border-mustard/80 rounded-lg pointer-events-none" />
      </div>
      {devices.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-sigam-muted">Cámara:</span>
          <select
            value={deviceId ?? ''}
            onChange={(e) => setDeviceId(e.target.value)}
            className="rounded-md border border-sigam-border bg-white px-2 py-1 text-sm"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Cámara ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}
      {status === 'error' && (
        <p className="text-sm text-burgundy">
          No se pudo iniciar la cámara. Dale permisos o tocá "Ingresar manualmente".
        </p>
      )}
    </div>
  );
}
