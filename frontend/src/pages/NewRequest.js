// Form to ask for blood (patients and hospitals).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, ButtonGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import useFetch from '../api/useFetch';
import { useAuth } from '../context/AuthContext';
import { BLOOD_GROUPS } from '../constants';

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    targetType: user.role === 'hospital' ? 'organization' : 'hospital',
    target: '',
    bloodGroup: 'O+',
    units: 1,
    urgency: 'Normal',
    patientName: '',
    city: user.city,
  });

  // List of hospitals or blood banks to choose from
  const facilityUrl = form.targetType === 'public' ? null : `/users/facilities?role=${form.targetType}`;
  const { data: facilities } = useFetch(facilityUrl, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // FormData is needed because we may upload a file
    const data = new FormData();
    Object.keys(form).forEach((key) => {
      if (form[key] !== '') data.append(key, form[key]);
    });
    if (form.targetType === 'public') data.delete('target');
    if (file) data.append('prescription', file);

    try {
      await api.post('/requests', data);
      toast.success('Request sent');
      navigate('/requests');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const options = [
    { value: 'hospital', label: 'Hospital' },
    { value: 'organization', label: 'Blood bank' },
    { value: 'public', label: 'Public donors' },
  ];

  return (
    <Card className="mx-auto" style={{ maxWidth: 700 }}>
      <Card.Body className="p-4">
        <h3 className="mb-3">New blood request</h3>
        <Form onSubmit={handleSubmit}>
          {user.role === 'patient' && (
            <ButtonGroup className="w-100 mb-3">
              {options.map((o) => (
                <Button
                  key={o.value}
                  variant={form.targetType === o.value ? 'danger' : 'outline-secondary'}
                  onClick={() => setForm({ ...form, targetType: o.value, target: '' })}
                >
                  {o.label}
                </Button>
              ))}
            </ButtonGroup>
          )}

          {form.targetType !== 'public' && (
            <Form.Group className="mb-3">
              <Form.Label>Send to</Form.Label>
              <Form.Select name="target" required value={form.target} onChange={handleChange}>
                <option value="">-- choose --</option>
                {facilities.map((f) => <option key={f._id} value={f._id}>{f.name} · {f.city}</option>)}
              </Form.Select>
            </Form.Group>
          )}

          <Row>
            <Col sm={4}>
              <Form.Group className="mb-3">
                <Form.Label>Blood group</Form.Label>
                <Form.Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                  {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col sm={4}>
              <Form.Group className="mb-3">
                <Form.Label>Units</Form.Label>
                <Form.Control name="units" type="number" min="1" max="20" value={form.units} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col sm={4}>
              <Form.Group className="mb-3">
                <Form.Label>Urgency</Form.Label>
                <Form.Select name="urgency" value={form.urgency} onChange={handleChange}>
                  <option value="Normal">Normal</option>
                  <option value="Critical">Critical / Emergency</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>Patient name</Form.Label>
                <Form.Control name="patientName" value={form.patientName} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>City</Form.Label>
                <Form.Control name="city" required value={form.city} onChange={handleChange} />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Prescription (PDF / JPG / PNG, max 5 MB)</Form.Label>
            <Form.Control type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files[0])} />
          </Form.Group>

          <Button type="submit" variant="danger" className="w-100">Send request</Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
