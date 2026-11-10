// Donors: book a donation and see certificates.
// Hospitals / blood banks: record walk-in donors and accept or reject bookings.
import { useState } from 'react';
import { Row, Col, Card, Button, Badge, Form, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import useFetch from '../api/useFetch';
import { useAuth } from '../context/AuthContext';

export default function Donations() {
  const { user } = useAuth();
  const isDonor = user.role === 'donor';
  const { data: donations, reload } = useFetch('/donations', [], ['donation:new', 'donation:updated']);

  return (
    <div>
      <h3 className="mb-3">{isDonor ? 'My donations' : 'Donors'}</h3>
      {isDonor ? <BookDonation onDone={reload} /> : <WalkIn onDone={reload} />}
      <Row className="g-3 mt-1">
        {donations.map((d) => (
          <Col md={6} key={d._id}>
            <DonationCard donation={d} isDonor={isDonor} onDone={reload} />
          </Col>
        ))}
      </Row>
    </div>
  );
}

function BookDonation({ onDone }) {
  const [type, setType] = useState('hospital');
  const { data: facilities } = useFetch(`/users/facilities?role=${type}`, []);
  const [facilityId, setFacilityId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  async function book() {
    try {
      await api.post('/donations', { facilityId, scheduledAt });
      toast.success('Donation booked');
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Card>
      <Card.Body>
        <Row className="g-2 align-items-end">
          <Col sm={3}>
            <Form.Label>Type</Form.Label>
            <Form.Select value={type} onChange={(e) => { setType(e.target.value); setFacilityId(''); }}>
              <option value="hospital">Hospital</option>
              <option value="organization">Blood bank</option>
            </Form.Select>
          </Col>
          <Col sm={4}>
            <Form.Label>Place</Form.Label>
            <Form.Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="">-- choose --</option>
              {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </Form.Select>
          </Col>
          <Col sm={3}>
            <Form.Label>Date & time</Form.Label>
            <Form.Control type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Col>
          <Col sm={2}>
            <Button variant="danger" className="w-100" onClick={book}>Book</Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function WalkIn({ onDone }) {
  const [donorEmail, setDonorEmail] = useState('');
  const [driveName, setDriveName] = useState('');

  async function record() {
    try {
      await api.post('/donations/walk-in', { donorEmail, driveName });
      toast.success('Donation saved');
      setDonorEmail('');
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Card>
      <Card.Body>
        <Row className="g-2 align-items-end">
          <Col sm={5}>
            <Form.Label>Donor email (walk-in)</Form.Label>
            <Form.Control value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
          </Col>
          <Col sm={4}>
            <Form.Label>Blood camp name (optional)</Form.Label>
            <Form.Control value={driveName} onChange={(e) => setDriveName(e.target.value)} />
          </Col>
          <Col sm={3}>
            <Button variant="danger" className="w-100" onClick={record}>Save donation</Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function DonationCard({ donation, isDonor, onDone }) {
  const [certificate, setCertificate] = useState(null);

  async function decide(decision) {
    try {
      await api.patch(`/donations/${donation._id}`, { decision });
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function openCertificate() {
    const response = await api.get(`/donations/${donation._id}/certificate`);
    setCertificate(response.data);
  }

  let color = 'warning';
  if (donation.status === 'Accepted') color = 'success';
  if (donation.status === 'Rejected') color = 'danger';

  const name = isDonor ? donation.facility && donation.facility.name : donation.donor && donation.donor.name;

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between">
          <b>{name} · {donation.bloodGroup}</b>
          <Badge bg={color}>{donation.status}</Badge>
        </div>
        <p className="small text-muted my-2">
          {new Date(donation.scheduledAt || donation.createdAt).toLocaleString()}
          {donation.batchNo && ' · ' + donation.batchNo}
        </p>

        {!isDonor && donation.status === 'Scheduled' && (
          <div className="d-flex gap-2">
            <Button size="sm" variant="danger" onClick={() => decide('Accepted')}>Accept</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => decide('Rejected')}>Reject</Button>
          </div>
        )}
        {isDonor && donation.status === 'Accepted' && (
          <Button size="sm" variant="outline-danger" onClick={openCertificate}>Certificate</Button>
        )}
      </Card.Body>

      {certificate && (
        <Modal show onHide={() => setCertificate(null)} size="lg">
          <Modal.Body>
            <div className="certificate">
              <div style={{ fontSize: 48 }}>🏅</div>
              <h3>Certificate of Blood Donation</h3>
              <p className="text-muted">This certifies that</p>
              <h2 className="text-blood">{certificate.donor}</h2>
              <p>
                donated <b>{certificate.units} unit(s) of {certificate.bloodGroup}</b> at{' '}
                <b>{certificate.facility}</b>, {certificate.city} on {new Date(certificate.date).toLocaleDateString()}.
              </p>
              <small className="text-muted">ID: {certificate.certificateId}</small>
            </div>
          </Modal.Body>
          <Modal.Footer className="no-print">
            <Button variant="danger" onClick={() => window.print()}>Print / Save as PDF</Button>
          </Modal.Footer>
        </Modal>
      )}
    </Card>
  );
}
