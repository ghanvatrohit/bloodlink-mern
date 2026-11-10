// Small box showing one number with a label, e.g. "Total units: 42"
import { Card } from 'react-bootstrap';

export default function StatCard({ label, value }) {
  return (
    <Card className="h-100">
      <Card.Body>
        <div className="fs-3 fw-bold text-blood">{value}</div>
        <div className="small text-muted text-uppercase">{label}</div>
      </Card.Body>
    </Card>
  );
}
