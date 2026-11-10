import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/api';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setLoading(false);
  }

  return (
    <AuthLayout title="Sign in">
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Form.Group>
        <Button type="submit" variant="danger" className="w-100" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className="text-center mt-3 small">
          No account? <Link to="/register">Register</Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
