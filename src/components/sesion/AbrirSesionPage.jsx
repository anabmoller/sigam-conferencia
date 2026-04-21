import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../ui/Card.jsx';
import { Input } from '../ui/Input.jsx';
import { useGuia } from '../../hooks/useGuia.js';
import { supabase } from '../../lib/supabase.js';

export default function AbrirSesionPage() {
  const { guia_nro } = useParams();
  const navigate = useNavigate();
  const { guia, sesionEO, sesionED, loading } = useGuia(guia_nro);

  const [tipo, setTipo] = useState('EGRESO');
  const [chapa, setChapa] = useState('');
  const [transportista, setTransportista] = useState('');
  const [precinto1, setPrecinto1] = useState('');
  const [precinto2, setPrecinto2] = useState('');
  const [precinto3, setPrecinto3] = useState('');
  const [animalesSinBoton, setAnimalesSinBoton] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sesionEO && !sesionED) setTipo('INGRESO');
    else if (!sesionEO && sesionED) setTipo('EGRESO');
    else setTipo('EGRESO');
  }, [sesionEO, sesionED]);

  const esInterno =
    guia?.establecimiento_origen_codigo &&
    guia?.establecimiento_destino_codigo &&
    guia?.proprietario_origen_codigo === guia?.proprietario_destino_codigo;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const precintos = [precinto1, precinto2, precinto3].map((p) => p.trim()).filter(Boolean);

    const payload = {
      tipo,
      guia_nro,
      chapa: chapa.trim() || null,
      transportista: transportista.trim() || null,
      precintos: precintos.length ? precintos : null,
      animales_sin_boton: tipo === 'INGRESO' ? Number(animalesSinBoton) || 0 : 0,
      cerrada_at: new Date().toISOString(),
      fonte: 'upload_manual',
    };

    const { error: err } = await supabase
      .from('sesiones')
      .upsert(payload, { onConflict: 'tipo,guia_nro' });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    navigate(`/guias/${guia_nro}/upload`);
  };

  if (loading) return <p className="text-sm text-sigam-muted">Cargando guía…</p>;
  if (!guia) return <p className="text-sm text-burgundy">Guía no encontrada. Volvé a escanear.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <header>
        <p className="text-xs text-sigam-muted">Guía</p>
        <h1 className="font-headline text-3xl font-mono">{guia_nro}</h1>
      </header>

      <Card>
        <CardHeader>
          <h2 className="font-headline text-xl">Abrir sesión</h2>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <p className="text-sm font-medium text-navy mb-2">Tipo de sesión</p>
              <div className="flex gap-3">
                <label className={`flex-1 border rounded-lg px-3 py-2 cursor-pointer text-sm ${tipo === 'EGRESO' ? 'border-navy bg-navy text-white' : 'border-sigam-border bg-white'}`}>
                  <input
                    type="radio"
                    name="tipo"
                    value="EGRESO"
                    checked={tipo === 'EGRESO'}
                    onChange={() => setTipo('EGRESO')}
                    className="sr-only"
                    disabled={!!sesionEO}
                  />
                  EGRESO (EO) {sesionEO && '— ya registrada'}
                </label>
                <label className={`flex-1 border rounded-lg px-3 py-2 cursor-pointer text-sm ${tipo === 'INGRESO' ? 'border-navy bg-navy text-white' : 'border-sigam-border bg-white'}`}>
                  <input
                    type="radio"
                    name="tipo"
                    value="INGRESO"
                    checked={tipo === 'INGRESO'}
                    onChange={() => setTipo('INGRESO')}
                    className="sr-only"
                    disabled={!!sesionED}
                  />
                  INGRESO (ED) {sesionED && '— ya registrada'}
                </label>
              </div>
            </div>

            <Input
              label="Chapa del camión"
              name="chapa"
              value={chapa}
              onChange={(e) => setChapa(e.target.value)}
              placeholder="ABC 1234"
            />

            <Input
              label="Transportista"
              name="transportista"
              value={transportista}
              onChange={(e) => setTransportista(e.target.value)}
              placeholder="Nombre o empresa"
            />

            {tipo === 'EGRESO' && esInterno && (
              <div>
                <p className="text-sm font-medium text-navy mb-2">Precintos (movimiento interno)</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input name="p1" value={precinto1} onChange={(e) => setPrecinto1(e.target.value)} placeholder="#1" />
                  <Input name="p2" value={precinto2} onChange={(e) => setPrecinto2(e.target.value)} placeholder="#2" />
                  <Input name="p3" value={precinto3} onChange={(e) => setPrecinto3(e.target.value)} placeholder="#3" />
                </div>
              </div>
            )}

            {tipo === 'INGRESO' && (
              <Input
                label="Animales sin bóton al llegar"
                type="number"
                min="0"
                name="sinboton"
                value={animalesSinBoton}
                onChange={(e) => setAnimalesSinBoton(e.target.value)}
                hint="Cuántos animales no fueron leídos por el bastón y hay que identificar manualmente por caravana."
              />
            )}

            {error && <p className="text-sm text-burgundy">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/conferencias')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Abrir sesión'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
