import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, ButtonGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/api';
import { BLOOD_GROUPS } from '../constants';
import AuthLayout from '../components/AuthLayout';

// Simple checks before sending the form
function validate(form) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
    errors.email = 'Enter a valid email';
  }
  if (!/^[6-9]\d{9}$/.test(form.mobile)) {
    errors.mobile = '10-digit mobile number starting with 6-9';
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,64}$/.test(form.password)) {
    errors.password = 'At least 8 characters with upper, lower, number and symbol';
  }
  return errors;
}

const ROLES = ['patient', 'donor', 'hospital', 'organization'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    role: 'patient',
    name: '',
    email: '',
    mobile: '',
    password: '',
    city: '',
    bloodGroup: 'O+',
    dob: '',
    healthEligible: false,
    licenseNo: '',
  });

  // Updates one field of the form
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Only send the fields that belong to the chosen role
    const body = { ...form };
    if (form.role !== 'donor') {
      delete body.bloodGroup;
      delete body.dob;
      delete body.healthEligible;
    }
    if (form.role !== 'hospital' && form.role !== 'organization') {
      delete body.licenseNo;
    }

    try {
      await register(body);
      toast.success('Welcome to LifeFlow');
      navigate('/');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const isFacility = form.role === 'hospital' || form.role === 'organization';

  return (
    <AuthLayout title="Create account">
      <Form onSubmit={handleSubmit}>
        <ButtonGroup className="w-100 mb-3">
          {ROLES.map((role) => (
            <Button
              key={role}
              variant={form.role === role ? 'danger' : 'outline-secondary'}
              className="text-capitalize"
              onClick={() => setForm({ ...form, role })}
            >
              {role}
            </Button>
          ))}
        </ButtonGroup>

        <Form.Group className="mb-2">
          <Form.Label>{isFacility ? 'Facility name' : 'Full name'}</Form.Label>
          <Form.Control name="name" required value={form.name} onChange={handleChange} />
        </Form.Group>

        <Row>
          <Col sm={6}>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control name="email" type="email" required value={form.email} onChange={handleChange} isInvalid={!!errors.email} />
              <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group className="mb-2">
              <Form.Label>Mobile</Form.Label>
              <Form.Control name="mobile" required value={form.mobile} onChange={handleChange} isInvalid={!!errors.mobile} />
              <Form.Control.Feedback type="invalid">{errors.mobile}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-2">
          <Form.Label>Password</Form.Label>
          <Form.Control name="password" type="password" required value={form.password} onChange={handleChange} isInvalid={!!errors.password} />
          <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>City</Form.Label>
          <Form.Control name="city" required value={form.city} onChange={handleChange} />
        </Form.Group>

        {form.role === 'donor' && (
          <>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Blood group</Form.Label>
                  <Form.Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                    {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Date of birth</Form.Label>
                  <Form.Control name="dob" type="date" required value={form.dob} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Check
              className="mb-2"
              name="healthEligible"
              checked={form.healthEligible}
              onChange={handleChange}
              label="I am healthy enough to donate (no recent illness, Hb ≥ 12.5)"
            />
          </>
        )}

        {isFacility && (
          <Form.Group className="mb-2">
            <Form.Label>License number</Form.Label>
            <Form.Control name="licenseNo" required value={form.licenseNo} onChange={handleChange} />
          </Form.Group>
        )}

        <Button type="submit" variant="danger" className="w-100 mt-2">Register</Button>
        <p className="text-center mt-3 small">
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
