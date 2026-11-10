// Blood stock page for hospitals and blood banks (organizations).
import { useState } from 'react';
import { Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import useFetch from '../api/useFetch';
import { useAuth } from '../context/AuthContext';
import { BLOOD_GROUPS } from '../constants';

// How many days until a date
function daysLeft(date) {
  return Math.ceil((new Date(date) - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function Inventory() {
  const { user } = useAuth();
  const { data: inventory, reload } = useFetch('/inventory', [], ['inventory:updated', 'inventory:received']);
  const [popup, setPopup] = useState(null); // 'add' | 'transfer' | 'replenish' | null

  // Put all batches of all groups into one list, soonest expiry first
  const batches = [];
  inventory.forEach((group) => {
    group.batches.forEach((b) => batches.push({ ...b, bloodGroup: group.bloodGroup }));
  });
  batches.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

  async function deleteBatch(id) {
    if (!window.confirm('Remove this batch?')) return;
    try {
      await api.delete(`/inventory/batches/${id}`, { data: { reason: 'expired/discarded' } });
      toast.success('Batch removed');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function closePopup() {
    setPopup(null);
    reload();
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h3 className="mb-0">{user.role === 'organization' ? 'Blood storage' : 'Inventory'}</h3>
        <div className="d-flex gap-2">
          <Button variant="danger" onClick={() => setPopup('add')}>+ Add batch</Button>
          {user.role === 'organization' && (
            <Button variant="outline-danger" onClick={() => setPopup('transfer')}>Send to hospital</Button>
          )}
          {user.role === 'hospital' && (
            <Button variant="outline-danger" onClick={() => setPopup('replenish')}>Ask blood bank for stock</Button>
          )}
        </div>
      </div>

      <Row className="g-3 mb-4">
        {inventory.map((g) => (
          <Col key={g.bloodGroup} xs={6} md={3}>
            <Card border={g.low ? 'danger' : undefined}>
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <span className="fs-5 fw-bold text-blood">{g.bloodGroup}</span>
                  {g.low && <Badge bg="danger">Low</Badge>}
                </div>
                <div className="fs-2 fw-bold">{g.totalUnits}</div>
                <small className="text-muted">min {g.threshold} · {g.expiringSoon} expiring soon</small>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Table responsive hover className="mb-0">
          <thead>
            <tr><th>Group</th><th>Batch</th><th>Units</th><th>Expires in</th><th>Storage</th><th></th></tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const days = daysLeft(b.expiresAt);
              let color = 'success';
              if (days <= 7) color = 'warning';
              if (days <= 0) color = 'danger';
              return (
                <tr key={b._id}>
                  <td><b>{b.bloodGroup}</b></td>
                  <td>{b.batchNo}</td>
                  <td>{b.units}</td>
                  <td><Badge bg={color}>{days <= 0 ? 'Expired' : days + ' days'}</Badge></td>
                  <td>{b.storageUnit || '—'}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-secondary" onClick={() => deleteBatch(b._id)}>Delete</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {popup === 'add' && <AddBatch onClose={closePopup} />}
      {popup === 'transfer' && <Transfer onClose={closePopup} />}
      {popup === 'replenish' && <Replenish onClose={closePopup} />}
    </div>
  );
}

function AddBatch({ onClose }) {
  const [form, setForm] = useState({ bloodGroup: 'O+', units: 1, batchNo: '', expiresAt: '', storageUnit: '' });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function save() {
    try {
      await api.post('/inventory/batches', { ...form, units: Number(form.units) });
      toast.success('Batch added');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton><Modal.Title>Add batch</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-2">
          <Form.Label>Blood group</Form.Label>
          <Form.Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
            {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Batch number</Form.Label>
          <Form.Control name="batchNo" value={form.batchNo} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Units</Form.Label>
          <Form.Control name="units" type="number" min="1" value={form.units} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Expiry date</Form.Label>
          <Form.Control name="expiresAt" type="date" value={form.expiresAt} onChange={handleChange} />
        </Form.Group>
        <Form.Group>
          <Form.Label>Storage place (fridge / shelf)</Form.Label>
          <Form.Control name="storageUnit" value={form.storageUnit} onChange={handleChange} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={save}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}

function Transfer({ onClose }) {
  const { data: hospitals } = useFetch('/users/facilities?role=hospital', []);
  const [form, setForm] = useState({ hospitalId: '', bloodGroup: 'O+', units: 1 });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function send() {
    try {
      await api.post('/inventory/transfer', { ...form, units: Number(form.units) });
      toast.success('Stock sent');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton><Modal.Title>Send stock to a hospital</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-2">
          <Form.Label>Hospital</Form.Label>
          <Form.Select name="hospitalId" value={form.hospitalId} onChange={handleChange}>
            <option value="">-- choose --</option>
            {hospitals.map((h) => <option key={h._id} value={h._id}>{h.name} · {h.city}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Blood group</Form.Label>
          <Form.Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
            {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label>Units</Form.Label>
          <Form.Control name="units" type="number" min="1" value={form.units} onChange={handleChange} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={send}>Send</Button>
      </Modal.Footer>
    </Modal>
  );
}

function Replenish({ onClose }) {
  const { user } = useAuth();
  const { data: banks } = useFetch('/users/facilities?role=organization', []);
  const [form, setForm] = useState({ target: '', bloodGroup: 'O+', units: 5, urgency: 'Normal' });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function send() {
    try {
      await api.post('/requests', { ...form, units: Number(form.units), targetType: 'organization', city: user.city });
      toast.success('Request sent to blood bank');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton><Modal.Title>Ask a blood bank for stock</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-2">
          <Form.Label>Blood bank</Form.Label>
          <Form.Select name="target" value={form.target} onChange={handleChange}>
            <option value="">-- choose --</option>
            {banks.map((o) => <option key={o._id} value={o._id}>{o.name} · {o.city}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Blood group</Form.Label>
          <Form.Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
            {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Units</Form.Label>
          <Form.Control name="units" type="number" min="1" value={form.units} onChange={handleChange} />
        </Form.Group>
        <Form.Group>
          <Form.Label>Urgency</Form.Label>
          <Form.Select name="urgency" value={form.urgency} onChange={handleChange}>
            <option>Normal</option>
            <option>Critical</option>
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={send}>Send</Button>
      </Modal.Footer>
    </Modal>
  );
}
