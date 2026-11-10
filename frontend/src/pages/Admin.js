// Admin page with tabs: reports, users, stock, chat checks, announcements, history.
import { useState } from 'react';
import { Tabs, Tab, Row, Col, Card, Table, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api/api';
import useFetch from '../api/useFetch';
import { BLOOD_GROUPS } from '../constants';
import StatCard from '../components/StatCard';

export default function Admin() {
  return (
    <div>
      <h3 className="mb-3">Admin</h3>
      {/* mountOnEnter: each tab loads its data only when opened */}
      <Tabs defaultActiveKey="reports" className="mb-3" mountOnEnter>
        <Tab eventKey="reports" title="Reports"><Reports /></Tab>
        <Tab eventKey="users" title="Users"><Users /></Tab>
        <Tab eventKey="stock" title="Stock"><Stock /></Tab>
        <Tab eventKey="messages" title="Messages"><Messages /></Tab>
        <Tab eventKey="announce" title="Announcement"><Announcement /></Tab>
        <Tab eventKey="history" title="History"><History /></Tab>
      </Tabs>
    </div>
  );
}

// Adds up a number field in a list, e.g. sum(list, 'units')
function sum(list, field) {
  let total = 0;
  list.forEach((item) => { total += item[field]; });
  return total;
}

function Reports() {
  const { data } = useFetch('/admin/stats', null, ['inventory:updated', 'request:new', 'sos:alert']);
  if (!data) return <Spinner animation="border" variant="danger" />;

  const biggest = Math.max(1, ...data.units.map((u) => u.units));

  function unitsFor(group) {
    const found = data.units.find((u) => u._id === group);
    return found ? found.units : 0;
  }
  function donorsFor(group) {
    return sum(data.donorGroups.filter((d) => d._id.group === group), 'count');
  }

  return (
    <>
      <Row className="g-3 mb-3">
        <Col sm={6} lg={3}><StatCard label="Units in stock" value={sum(data.units, 'units')} /></Col>
        <Col sm={6} lg={3}><StatCard label="Users" value={sum(data.roles, 'count')} /></Col>
        <Col sm={6} lg={3}><StatCard label="Low stock alerts" value={data.shortages.length} /></Col>
        <Col sm={6} lg={3}><StatCard label="Donations" value={data.donations} /></Col>
      </Row>

      <Row className="g-3">
        <Col lg={6}>
          <Card className="h-100"><Card.Body>
            <h5>Units by blood group</h5>
            {BLOOD_GROUPS.map((g) => (
              <div key={g} className="d-flex align-items-center gap-2 mb-2 small">
                <b style={{ width: 36 }}>{g}</b>
                <div className="bar flex-grow-1">
                  <div className="bar-fill" style={{ width: (unitsFor(g) / biggest) * 100 + '%' }} />
                </div>
                <span style={{ width: 36 }} className="text-end">{unitsFor(g)}</span>
              </div>
            ))}
          </Card.Body></Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100"><Card.Body>
            <h5>Donors by blood group</h5>
            <Row className="g-2">
              {BLOOD_GROUPS.map((g) => (
                <Col xs={3} key={g}>
                  <div className="bg-light rounded text-center p-2">
                    <div className="fw-bold text-blood">{g}</div>
                    <div className="fs-5">{donorsFor(g)}</div>
                  </div>
                </Col>
              ))}
            </Row>
            <div className="mt-3 d-flex flex-wrap gap-2">
              {data.roles.map((r) => <Badge key={r._id} bg="secondary">{r._id}: {r.count}</Badge>)}
            </div>
          </Card.Body></Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100"><Card.Body>
            <h5>Emergencies by city</h5>
            {data.emergencies.length === 0 && <p className="text-muted">No emergencies right now.</p>}
            <div className="d-flex flex-wrap gap-2">
              {data.emergencies.map((e) => (
                <Badge key={e._id.city + e._id.group} bg="danger" className="p-2 text-capitalize">
                  {e._id.city} · {e._id.group} · {e.count}
                </Badge>
              ))}
            </div>
          </Card.Body></Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100"><Card.Body>
            <h5>Low stock</h5>
            {data.shortages.map((s) => (
              <div key={s._id} className="d-flex justify-content-between border-bottom py-1 small">
                <span>{s.owner && s.owner.name} <span className="text-muted text-capitalize">({s.owner && s.owner.city})</span></span>
                <b className="text-blood">{s.bloodGroup}: {s.totalUnits}/{s.threshold}</b>
              </div>
            ))}
          </Card.Body></Card>
        </Col>
      </Row>
    </>
  );
}

function Users() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const { data, reload } = useFetch(`/admin/users?role=${role}&q=${search}`, { rows: [] });

  async function update(id, changes) {
    try {
      await api.patch(`/admin/users/${id}`, changes);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this user?')) return;
    await api.delete(`/admin/users/${id}`);
    reload();
  }

  return (
    <Card>
      <Card.Body className="d-flex flex-wrap gap-2">
        <Form.Control style={{ maxWidth: 260 }} placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Form.Select style={{ maxWidth: 180 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {['patient', 'donor', 'hospital', 'organization', 'admin'].map((r) => <option key={r}>{r}</option>)}
        </Form.Select>
      </Card.Body>
      <Table responsive hover size="sm" className="mb-0">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Verified</th><th>Blocked</th><th></th></tr>
        </thead>
        <tbody>
          {data.rows.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td className="text-capitalize">{u.city}</td>
              <td><Form.Check type="switch" checked={u.isVerified} onChange={(e) => update(u._id, { isVerified: e.target.checked })} /></td>
              <td><Form.Check type="switch" checked={u.isBlocked} onChange={(e) => update(u._id, { isBlocked: e.target.checked })} /></td>
              <td><Button size="sm" variant="outline-danger" onClick={() => remove(u._id)}>Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function Stock() {
  const { data: stock, reload } = useFetch('/admin/inventory', []);

  async function saveMinimum(id, value) {
    await api.patch(`/admin/inventory/${id}`, { threshold: Number(value) });
    reload();
  }

  return (
    <Card>
      <Table responsive size="sm" className="mb-0">
        <thead>
          <tr><th>Place</th><th>Group</th><th>Units</th><th>Batches</th><th>Minimum (alert below)</th></tr>
        </thead>
        <tbody>
          {stock.map((i) => (
            <tr key={i._id}>
              <td>{i.owner && i.owner.name}</td>
              <td><b>{i.bloodGroup}</b></td>
              <td className={i.totalUnits < i.threshold ? 'text-danger fw-bold' : ''}>{i.totalUnits}</td>
              <td>{i.batches.length}</td>
              <td>
                <Form.Control
                  size="sm"
                  type="number"
                  style={{ width: 90 }}
                  defaultValue={i.threshold}
                  onBlur={(e) => saveMinimum(i._id, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function Messages() {
  const [search, setSearch] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const { data: messages, reload } = useFetch(`/admin/messages?q=${search}&flagged=${onlyFlagged}`, [], ['moderation:flagged']);

  async function remove(id) {
    await api.delete(`/admin/messages/${id}`);
    toast.success('Message removed');
    reload();
  }

  return (
    <Card><Card.Body>
      <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
        <Form.Control style={{ maxWidth: 260 }} placeholder="Search messages" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Form.Check type="switch" label="Reported only" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
      </div>
      {messages.map((m) => (
        <div key={m._id} className="d-flex justify-content-between border-bottom py-2">
          <div>
            <div className="small">
              <b>{m.sender && m.sender.name}</b>{' '}
              <span className="text-muted">({m.sender && m.sender.role}) · {new Date(m.createdAt).toLocaleString()}</span>{' '}
              {m.flagged && <Badge bg="danger">{m.flagReason}</Badge>}
            </div>
            <div>{m.text}</div>
          </div>
          <Button size="sm" variant="outline-danger" onClick={() => remove(m._id)}>Delete</Button>
        </div>
      ))}
    </Card.Body></Card>
  );
}

function Announcement() {
  const [form, setForm] = useState({ title: '', body: '', type: 'shortage', city: '', bloodGroup: '' });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function send() {
    // Only send fields that are filled in
    const body = {};
    Object.keys(form).forEach((key) => {
      if (form[key]) body[key] = form[key];
    });
    try {
      await api.post('/admin/broadcasts', body);
      toast.success('Announcement sent');
      setForm({ ...form, title: '', body: '' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Card style={{ maxWidth: 700 }}><Card.Body>
      <Form.Group className="mb-2">
        <Form.Label>Type</Form.Label>
        <Form.Select name="type" value={form.type} onChange={handleChange}>
          <option value="shortage">Blood shortage in area</option>
          <option value="maintenance">System maintenance</option>
          <option value="sos">SOS</option>
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-2">
        <Form.Label>Title</Form.Label>
        <Form.Control name="title" value={form.title} onChange={handleChange} />
      </Form.Group>
      <Form.Group className="mb-2">
        <Form.Label>Message</Form.Label>
        <Form.Control as="textarea" rows={3} name="body" value={form.body} onChange={handleChange} />
      </Form.Group>
      <Row>
        <Col sm={6}>
          <Form.Group className="mb-3">
            <Form.Label>City (empty = everyone)</Form.Label>
            <Form.Control name="city" value={form.city} onChange={handleChange} />
          </Form.Group>
        </Col>
        <Col sm={6}>
          <Form.Group className="mb-3">
            <Form.Label>Blood group</Form.Label>
            <Form.Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
              <option value="">Any</option>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Button variant="danger" onClick={send}>Send announcement</Button>
    </Card.Body></Card>
  );
}

const ACTIONS = ['ALLOT', 'DONATION', 'INVENTORY_ADJUST', 'TRANSFER', 'REQUEST_STATUS', 'USER_ADMIN', 'MESSAGE_DELETE'];

function History() {
  const [action, setAction] = useState('');
  const { data: logs } = useFetch(`/admin/audit-logs?action=${action}`, []);

  return (
    <Card>
      <Card.Body>
        <Form.Select style={{ maxWidth: 240 }} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a}>{a}</option>)}
        </Form.Select>
      </Card.Body>
      <Table responsive size="sm" className="mb-0">
        <thead>
          <tr><th>Time</th><th>Action</th><th>By</th><th>Item</th><th>Details</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td><Badge bg="secondary">{l.action}</Badge></td>
              <td>{l.actor && l.actor.name}</td>
              <td>{l.entity}</td>
              <td className="small font-monospace text-truncate" style={{ maxWidth: 260 }}>{JSON.stringify(l.meta)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
