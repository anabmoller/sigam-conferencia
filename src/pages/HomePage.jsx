import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardBody } from '../components/ui/Card.jsx';

const ACTIONS = [
  {
    to: '/scan',
    title: 'Escanear guía',
    desc: 'Leé el QR de la guía SENACSA y registrá el movimiento con coordenadas GPS.',
    variant: 'primary',
  },
  {
    to: '/conferencias',
    title: 'Conferencias',
    desc: 'Estado de conciliación por guía. Resolución de discrepancias.',
    variant: 'outline',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-sigam-muted">Trazabilidad individual del ganado</p>
        <h1 className="font-headline text-5xl mt-1">
          La <span className="text-burgundy">guía</span> es la columna vertebral.
        </h1>
        <p className="mt-3 max-w-2xl text-sigam-muted">
          Toda sesión tiene guía. Toda lectura tiene EID. SIGAM Trazabilidad concilia egresos e ingresos por guía y detecta
          faltantes, extras y bótones perdidos.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {ACTIONS.map((a) => (
          <Card key={a.to}>
            <CardBody className="space-y-3">
              <h2 className="font-headline text-2xl">{a.title}</h2>
              <p className="text-sm text-sigam-muted">{a.desc}</p>
              <Button as={Link} to={a.to} variant={a.variant}>
                {a.title}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
