// Messages page: list of chats on the left, open chat on the right.
import { useEffect, useRef, useState } from 'react';
import { Card, Form, Button, ListGroup, Badge, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../api/api';
import useFetch from '../api/useFetch';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { user } = useAuth();
  const { data: conversations, reload } = useFetch('/chat/conversations', [], ['chat:notify']);
  const [search, setSearch] = useState('');
  const { data: contacts } = useFetch(search ? `/chat/contacts?q=${search}` : null, []);
  const [active, setActive] = useState(null);

  // The other person in a conversation
  function otherPerson(conversation) {
    return conversation.participants.find((p) => p._id !== user._id);
  }

  async function startChat(contact) {
    const response = await api.post('/chat/conversations', { userId: contact._id });
    setSearch('');
    await reload();
    setActive(response.data);
  }

  // On desktop, open the first chat automatically
  useEffect(() => {
    if (!active && conversations.length > 0 && window.innerWidth >= 768) {
      setActive(conversations[0]);
    }
  }, [conversations, active]);

  return (
    <Card className="chat-box overflow-hidden">
      <Row className="g-0 h-100">
        {/* Left: chat list (hidden on mobile when a chat is open) */}
        <Col md={4} className={`border-end h-100 d-flex flex-column ${active ? 'd-none d-md-flex' : ''}`}>
          <div className="p-2 position-relative">
            <Form.Control placeholder="Search people to chat..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && contacts.length > 0 && (
              <ListGroup className="position-absolute w-100 shadow" style={{ zIndex: 10, left: 0 }}>
                {contacts.map((c) => (
                  <ListGroup.Item key={c._id} action onClick={() => startChat(c)}>
                    {c.name} <small className="text-muted">({c.role})</small>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
          <ListGroup variant="flush" className="overflow-auto flex-grow-1">
            {conversations.map((c) => {
              const other = otherPerson(c);
              return (
                <ListGroup.Item key={c._id} action active={active && active._id === c._id} onClick={() => setActive(c)}>
                  <div className="d-flex justify-content-between">
                    <b>{other && other.name}</b>
                    <small className="text-capitalize">{other && other.role}</small>
                  </div>
                  <small className="text-truncate d-block">{c.lastMessage ? c.lastMessage.text : 'No messages yet'}</small>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Col>

        {/* Right: open chat */}
        {active && (
          <Col md={8} className="h-100">
            <ChatWindow key={active._id} conversation={active} me={user} other={otherPerson(active)} onBack={() => setActive(null)} />
          </Col>
        )}
      </Row>
    </Card>
  );
}

function ChatWindow({ conversation, me, other, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingName, setTypingName] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load old messages
    api.get(`/chat/conversations/${conversation._id}/messages`).then((res) => setMessages(res.data));

    const socket = getSocket();
    if (!socket) return;
    socket.emit('chat:join', conversation._id);
    socket.emit('chat:read', { conversationId: conversation._id });

    let typingTimer;

    function onMessage(message) {
      if (message.conversation !== conversation._id) return;
      // add the message if we don't already have it
      setMessages((old) => (old.some((m) => m._id === message._id) ? old : [...old, message]));
    }
    function onTyping(data) {
      setTypingName(data.name);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => setTypingName(null), 1500);
    }
    function onDeleted(data) {
      setMessages((old) => old.filter((m) => m._id !== data.messageId));
    }

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:deleted', onDeleted);

    // Clean up when the chat closes
    return () => {
      clearTimeout(typingTimer);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:deleted', onDeleted);
    };
  }, [conversation._id]);

  // Scroll to the newest message
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send', { conversationId: conversation._id, text }, (reply) => {
        if (reply && reply.error) toast.error(reply.error);
      });
    }
    setText('');
  }

  function handleTyping(e) {
    setText(e.target.value);
    const socket = getSocket();
    if (socket) socket.emit('chat:typing', { conversationId: conversation._id });
  }

  async function report(messageId) {
    await api.post(`/chat/messages/${messageId}/flag`, { reason: 'user-report' });
    toast.success('Reported to admin');
  }

  return (
    <div className="d-flex flex-column h-100">
      <div className="border-bottom p-2 d-flex align-items-center gap-2">
        <Button variant="light" size="sm" className="d-md-none" onClick={onBack}>←</Button>
        <b>{other && other.name}</b>
        <Badge bg="secondary" className="text-capitalize">{other && other.role}</Badge>
      </div>

      <div className="chat-messages flex-grow-1 p-3">
        {messages.map((m) => {
          const mine = m.sender._id === me._id;
          return (
            <div key={m._id} className={`d-flex mb-2 ${mine ? 'justify-content-end' : 'justify-content-start'}`}>
              <div className={`bubble ${mine ? 'bubble-mine' : 'bubble-other'}`}>
                {m.text}
                <div className="small opacity-75">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!mine && (
                <Button variant="link" size="sm" className="text-muted" title="Report" onClick={() => report(m._id)}>
                  ⚑
                </Button>
              )}
            </div>
          );
        })}
        {typingName && <small className="text-muted">{typingName} is typing...</small>}
        <div ref={bottomRef} />
      </div>

      <Form onSubmit={sendMessage} className="border-top p-2 d-flex gap-2">
        <Form.Control placeholder="Type a message" value={text} onChange={handleTyping} />
        <Button type="submit" variant="danger">Send</Button>
      </Form>
    </div>
  );
}
