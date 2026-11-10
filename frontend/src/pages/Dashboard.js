// Home page. Shows different content for each role.
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, ButtonGroup, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import useFetch from '../api/useFetch';
import { useAuth } from '../context/AuthContext';
import { STATUS_COLOR } from '../constants';
import StatCard from '../components/StatCard';
import Pipeline from '../components/Pipeline';
import Admin from './Admin';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: broadcasts } = useFetch('/broadcasts', [], ['broadcast:alert']);

  if (user.role === 'admin') return <Admin />;

  let content;
  if (user.role === 'donor') content = <DonorHome />;
  else if (user.role === 'hospital' || user.role === 'organization') content = <FacilityHome />;
  else content = <PatientHome />;

  return (
    <div>
      {broadcasts.slice(0, 2).map((b) => (
        <Alert key={b._id} variant={b.type === 'maintenance' ? 'info' : 'danger'}>
          <b>{b.title}</b> — {b.body}
        </Alert>
      ))}
      {content}
    </div>
  );
}

const REQUEST_EVENTS = ['request:new', 'request:updated', 'request:volunteer', 'sos:alert'];

function PatientHome() {
  const { data: requests } = useFetch('/requests', [], REQUEST_EVENTS);
  const active = requests.filter((r) => r.status !== 'Fulfilled' && r.status !== 'Cancelled');

  return (
    <>
      <Row className="g-3 mb-4">
        <Col sm={4}><StatCard label="Active requests" value={active.length} /></Col>
        <Col sm={4}><StatCard label="Fulfilled" value={requests.filter((r) => r.status === 'Fulfilled').length} /></Col>
        <Col sm={4}><StatCard label="Critical" value={active.filter((r) => r.urgency === 'Critical').length} /></Col>
      </Row>
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">My active requests</h5>
            <Button as={Link} to="/requests/new" variant="danger">New request</Button>
          </div>
          {active.length === 0 && <p className="text-muted">No active requests.</p>}
          {active.map((r) => <Pipeline key={r._id} request={r} />)}
        </Card.Body>
      </Card>
    </>
  );
}

function DonorHome() {
  const { user, setUser } = useAuth();
  const { data: donations } = useFetch('/donations', [], ['donation:new', 'donation:updated']);
  const { data: requests } = useFetch('/requests', [], REQUEST_EVENTS);

  const accepted = donations.filter((d) => d.status === 'Accepted').length;

  // A donor must wait 90 days between donations
  let nextDate = null;
  if (user.lastDonationAt) {
    nextDate = new Date(new Date(user.lastDonationAt).getTime() + 90 * 24 * 60 * 60 * 1000);
  }

  async function changeAvailability(value) {
    try {
      const response = await api.patch('/users/me/availability', { availability: value });
      setUser(response.data.user);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const coolDown = user.availability === 'Cool-down';

  return (
    <>
      <Row className="g-3 mb-4">
        <Col sm={4}><StatCard label="Donations" value={accepted} /></Col>
        <Col sm={4}><StatCard label="Lives helped (approx.)" value={accepted * 3} /></Col>
        <Col sm={4}><StatCard label="Open requests near you" value={requests.length} /></Col>
      </Row>
      <Card>
        <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h5 className="mb-0">Availability</h5>
            {coolDown && nextDate && <small className="text-muted">Resting until {nextDate.toLocaleDateString()}</small>}
          </div>
          <ButtonGroup>
            {['Active', 'Inactive', 'Cool-down'].map((value) => (
              <Button
                key={value}
                variant={user.availability === value ? 'danger' : 'outline-secondary'}
                disabled={coolDown || value === 'Cool-down'}
                onClick={() => changeAvailability(value)}
              >
                {value}
              </Button>
            ))}
          </ButtonGroup>
        </Card.Body>
      </Card>
    </>
  );
}

function FacilityHome() {
  const { data: inventory } = useFetch('/inventory', [], ['inventory:updated', 'inventory:received']);
  const { data: requests } = useFetch('/requests', [], REQUEST_EVENTS);

  let totalUnits = 0;
  let expiring = 0;
  inventory.forEach((item) => {
    totalUnits += item.totalUnits;
    expiring += item.expiringSoon;
  });

  return (
    <>
      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}><StatCard label="Total units" value={totalUnits} /></Col>
        <Col sm={6} lg={3}><StatCard label="Low groups" value={inventory.filter((i) => i.low).length} /></Col>
        <Col sm={6} lg={3}><StatCard label="Expiring in 7 days" value={expiring} /></Col>
        <Col sm={6} lg={3}><StatCard label="Pending requests" value={requests.filter((r) => r.status === 'Pending').length} /></Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <h5>Stock by blood group</h5>
          <Row className="g-2">
            {inventory.map((item) => (
              <Col key={item.bloodGroup} xs={6} sm={3} lg={3} xl>
                <div className={`border rounded p-2 text-center ${item.low ? 'border-danger bg-danger-subtle' : ''}`}>
                  <div className="fw-bold text-blood">{item.bloodGroup}</div>
                  <div className="fs-4 fw-bold">{item.totalUnits}</div>
                  <small className="text-muted">units</small>
                </div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <h5>Recent requests</h5>
          {requests.slice(0, 5).map((r) => (
            <div key={r._id} className="d-flex justify-content-between border-bottom py-2 small">
              <span>{r.requester && r.requester.name} · {r.units} units {r.bloodGroup}</span>
              <Badge bg={STATUS_COLOR[r.status]}>{r.status}</Badge>
            </div>
          ))}
        </Card.Body>
      </Card>
    </>
  );
}
