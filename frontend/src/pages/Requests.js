// List of blood requests. What you can do depends on your role.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Badge, Button, Nav, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import useFetch from '../api/useFetch';
import { useAuth } from '../context/AuthContext';
import { STATUS_COLOR, SERVER_URL } from '../constants';
import Pipeline from '../components/Pipeline';

const REQUEST_EVENTS = ['request:new', 'request:updated', 'request:volunteer', 'sos:alert'];

export default function Requests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scope, setScope] = useState('incoming'); // hospitals: incoming or outgoing
  const { data: requests, reload } = useFetch(`/requests?scope=${scope}`, [], REQUEST_EVENTS);
  const [reviewing, setReviewing] = useState(null);

  const isFacility = user.role === 'hospital' || user.role === 'organization';
  const isIncoming = isFacility && scope === 'incoming';
  const isDonor = user.role === 'donor';

  async function changeStatus(request, status) {
    try {
      await api.patch(`/requests/${request._id}/status`, { status });
      toast.success('Marked ' + status);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function volunteer(request) {
    try {
      await api.post(`/requests/${request._id}/volunteer`);
      toast.success('Thanks for volunteering!');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function chatWith(userId) {
    try {
      await api.post('/chat/conversations', { userId });
      navigate('/chat');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h3 className="mb-0">{isDonor ? 'Open requests near you' : 'Requests'}</h3>
        {(user.role === 'patient' || user.role === 'hospital') && (
          <Button as={Link} to="/requests/new" variant="danger">New request</Button>
        )}
      </div>

      {user.role === 'hospital' && (
        <Nav variant="tabs" activeKey={scope} onSelect={(key) => setScope(key)} className="mb-3">
          <Nav.Item><Nav.Link eventKey="incoming">From patients</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="outgoing">To blood banks</Nav.Link></Nav.Item>
        </Nav>
      )}

      {requests.length === 0 && <p className="text-muted">Nothing here yet.</p>}

      <Row className="g-3">
        {requests.map((r) => (
          <Col md={6} key={r._id}>
            <Card border={r.urgency === 'Critical' ? 'danger' : undefined}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fs-4 fw-bold text-blood">{r.bloodGroup}</span> {r.units} units{' '}
                    {r.isSOS && <Badge bg="danger">SOS</Badge>}
                  </div>
                  <Badge bg={STATUS_COLOR[r.status]}>{r.status}</Badge>
                </div>

                <p className="small text-muted my-2">
                  {isIncoming || isDonor
                    ? 'From ' + (r.requester ? r.requester.name : '')
                    : 'To ' + (r.target ? r.target.name : 'public donors')}
                  {' · '}{r.city} · {new Date(r.createdAt).toLocaleString()}
                </p>

                {!isIncoming && !isDonor && <Pipeline request={r} />}

                <div className="d-flex flex-wrap gap-2">
                  {r.prescriptionUrl && (
                    <Button size="sm" variant="outline-secondary" href={SERVER_URL + r.prescriptionUrl} target="_blank">
                      Prescription
                    </Button>
                  )}
                  {isIncoming && r.status === 'Pending' && (
                    <Button size="sm" variant="danger" onClick={() => setReviewing(r)}>Review & give blood</Button>
                  )}
                  {isIncoming && r.status === 'Accepted' && (
                    <Button size="sm" variant="outline-primary" onClick={() => changeStatus(r, 'In-Transit')}>Mark on the way</Button>
                  )}
                  {isIncoming && (r.status === 'Accepted' || r.status === 'In-Transit') && (
                    <Button size="sm" variant="success" onClick={() => changeStatus(r, 'Fulfilled')}>Mark delivered</Button>
                  )}
                  {isDonor && (
                    <Button size="sm" variant="danger" onClick={() => volunteer(r)}>I can donate</Button>
                  )}
                  {isIncoming && r.requester && (
                    <Button size="sm" variant="outline-secondary" onClick={() => chatWith(r.requester._id)}>Chat</Button>
                  )}
                  {!isIncoming && r.assignedTo && (
                    <Button size="sm" variant="outline-secondary" onClick={() => chatWith(r.assignedTo._id)}>Chat</Button>
                  )}
                  {!isIncoming && !isDonor && (r.status === 'Pending' || r.status === 'Accepted') && (
                    <Button size="sm" variant="outline-secondary" onClick={() => changeStatus(r, 'Cancelled')}>Cancel</Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {reviewing && (
        <ReviewPopup request={reviewing} onClose={() => { setReviewing(null); reload(); }} />
      )}
    </div>
  );
}

// Popup where a hospital / blood bank checks the prescription and gives stock
function ReviewPopup({ request, onClose }) {
  const [verified, setVerified] = useState(false);

  async function allot() {
    try {
      await api.post(`/requests/${request._id}/allot`, { verified });
      toast.success('Blood given from stock');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function reject() {
    try {
      await api.patch(`/requests/${request._id}/status`, { status: 'Cancelled', note: 'Rejected' });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton><Modal.Title>Review request</Modal.Title></Modal.Header>
      <Modal.Body>
        <p>
          <b>{request.units} units {request.bloodGroup}</b> for{' '}
          {request.patientName || (request.requester && request.requester.name)} · {request.urgency}
        </p>
        {request.prescriptionUrl ? (
          <iframe title="prescription" src={SERVER_URL + request.prescriptionUrl} className="w-100 border rounded" style={{ height: 300 }} />
        ) : (
          <p className="text-muted">No prescription attached.</p>
        )}
        <Form.Check
          className="mt-3"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
          label="I have checked the medical report"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={reject}>Reject</Button>
        <Button variant="danger" onClick={allot}>Give blood from stock</Button>
      </Modal.Footer>
    </Modal>
  );
}
