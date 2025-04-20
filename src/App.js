import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL);

function App() {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState('');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSignup, setIsSignup] = useState(false);

  const fetchMessages = async () => {
    if (!user || !receiver) return;
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/messages/${user.username}/${receiver}`);
    setMessages(res.data);
  };

  const sendMessage = async () => {
    if (!content || !receiver) return;
    const msg = { sender: user.username, receiver, content };
    await axios.post(`${process.env.REACT_APP_API_URL}/api/messages`, msg);
    socket.emit('send_message', msg);
    setContent('');
  };

  useEffect(() => {
    socket.on('receive_message', (msg) => {
      if (
        (msg.sender === user?.username && msg.receiver === receiver) ||
        (msg.receiver === user?.username && msg.sender === receiver)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => socket.off('receive_message');
  }, [user, receiver]);

  // Auth logic
  if (!user) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const signup = async () => {
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
          username, email, password
        });
        alert("Signup successful. Please login.");
        setIsSignup(false);
      } catch (err) {
        alert("Signup error: " + err.response?.data?.message || "Unknown error");
      }
    };

    const login = async () => {
      try {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
          email, password
        });
        setUser(res.data.user);
      } catch (err) {
        alert("Login failed: " + err.response?.data?.message || "Unknown error");
      }
    };

    return (
      <div style={styles.container}>
        <h2>{isSignup ? "Sign Up" : "Login"}</h2>
        {isSignup && <input placeholder="Username" onChange={e => setUsername(e.target.value)} style={styles.input} />}
        <input placeholder="Email" onChange={e => setEmail(e.target.value)} style={styles.input} />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} />
        <button onClick={isSignup ? signup : login} style={styles.button}>
          {isSignup ? "Sign Up" : "Login"}
        </button>
        <p onClick={() => setIsSignup(!isSignup)} style={styles.toggle}>
          {isSignup ? "Already have an account? Login" : "Don't have an account? Sign up"}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2>Welcome, {user.username}</h2>
      <input placeholder="Chat with (receiver username)" onChange={e => setReceiver(e.target.value)} style={styles.input} />
      <button onClick={fetchMessages} style={styles.button}>Load Messages</button>
      <div style={styles.chatBox}>
        {messages.map((msg, idx) => (
          <div key={idx}><b>{msg.sender}:</b> {msg.content}</div>
        ))}
      </div>
      <input value={content} onChange={e => setContent(e.target.value)} placeholder="Type your message..." style={styles.input} />
      <button onClick={sendMessage} style={styles.button}>Send</button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '40px auto',
    padding: '20px',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: 'Segoe UI, sans-serif'
  },
  input: {
    padding: '10px',
    width: '100%',
    marginBottom: '10px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '5px'
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  toggle: {
    color: '#007bff',
    textAlign: 'center',
    cursor: 'pointer'
  },
  chatBox: {
    height: '200px',
    overflowY: 'auto',
    border: '1px solid #eee',
    padding: '10px',
    background: '#f9f9f9',
    marginBottom: '10px',
    borderRadius: '5px'
  }
};

export default App;
