// Two-column frame used by the Login and Register pages.
import { Container, Row, Col, Card } from 'react-bootstrap';

export default function AuthLayout({ title, children }) {
  return (
    <Container fluid>
      <Row>
        <Col lg={6} className="auth-banner d-none d-lg-flex flex-column justify-content-between p-5">
          <h3>🩸 LifeFlow</h3>
          <div>
            <h1 className="display-5 fw-bold">Every drop, tracked and delivered.</h1>
            <p className="mt-3">Connecting patients, donors, hospitals and blood banks in real time.</p>
          </div>
          <small>© LifeFlow Network</small>
        </Col>
        <Col lg={6} className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
          <Card className="w-100 border-0 shadow-sm" style={{ maxWidth: 460 }}>
            <Card.Body className="p-4">
              <h3 className="mb-4">{title}</h3>
              {children}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
