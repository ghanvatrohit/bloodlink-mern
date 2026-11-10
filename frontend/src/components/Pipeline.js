// Shows the progress of a blood request: Pending → Accepted → In-Transit → Fulfilled
import { Badge } from 'react-bootstrap';

const STEPS = ['Pending', 'Accepted', 'In-Transit', 'Fulfilled'];

export default function Pipeline({ request }) {
  const currentStep = STEPS.indexOf(request.status);
  const cancelled = request.status === 'Cancelled';

  return (
    <div className="border rounded p-2 mb-2">
      <div className="mb-2">
        <b>{request.units} units {request.bloodGroup}</b>{' '}
        <Badge bg={request.urgency === 'Critical' ? 'danger' : 'secondary'}>{request.urgency}</Badge>{' '}
        <span className="small text-muted">→ {request.target ? request.target.name : 'Public donors'}</span>
      </div>
      <div className="d-flex gap-1">
        {STEPS.map((step, i) => (
          <div key={step} className="flex-fill">
            <div className={!cancelled && i <= currentStep ? 'bar-fill' : 'bar'} />
            <div className="small text-muted">{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
