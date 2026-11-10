// Red SOS button that sends an emergency alert to matching donors.
import { useState } from 'react';
import { Button, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { BLOOD_GROUPS } from '../constants';

export default function SosButton() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [units, setUnits] = useState(1);
  const [city, setCity] = useState(user.city);

  async function sendSos() {
    try {
      await api.post('/requests/sos', { bloodGroup, units: Number(units), city });
      toast.success('SOS sent to matching donors');
      setShow(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setShow(true)}>
        🚨 SOS
      </Button>

      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Emergency alert</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Blood group</Form.Label>
            <Form.Select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Units</Form.Label>
            <Form.Control type="number" min="1" max="20" value={units} onChange={(e) => setUnits(e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>City</Form.Label>
            <Form.Control value={city} onChange={(e) => setCity(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button variant="danger" onClick={sendSos}>Send now</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
