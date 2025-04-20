import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

// Base URL of backend API from environment variable
const API_URL = process.env.REACT_APP_API_URL;

function App() {
  // Authentication and form states
  const [isLoginScreen, setIsLoginScreen] = useState(true);    // toggle between Login and Signup
  const [isAuthenticated, setIsAuthenticated] = useState(false);  
  const [user, setUser] = useState(null);                      // logged-in user info

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // Signup form fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Chat states
  const [friendEmail, setFriendEmail] = useState('');          // friend identifier entered by user
  const [friend, setFriend] = useState(null);                  // friend info (could include id/name)
  const [messages, setMessages] = useState([]);                // list of chat messages
  const [newMessage, setNewMessage] = useState('');            // current message input

  const socketRef = useRef(null);                              // Socket.io client instance ref
  const bottomRef = useRef(null);                              // Ref for auto-scroll to bottom

  // Effect to auto-scroll chat to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle user login
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, {
        email: loginEmail,
        password: loginPassword
      });
      const userData = res.data;
      // Assume response contains user info and possibly a token
      setUser(userData);
      setIsAuthenticated(true);
      // If a token is provided, store it for future requests (e.g., in Authorization header)
      if (userData.token) {
        localStorage.setItem('token', userData.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      }
    } catch (err) {
      console.error('Login failed:', err);
      alert('Login failed. Please check your credentials and try again.');
    }
  };

  // Handle new user signup
  const handleSignup = async () => {
    try {
      const res = await axios.post(`${API_URL}/signup`, {
        name: signupName,
        email: signupEmail,
        password: signupPassword
      });
      const userData = res.data;
      // After successful signup, log the user in (set state as authenticated)
      setUser(userData);
      setIsAuthenticated(true);
      if (userData.token) {
        localStorage.setItem('token', userData.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      }
    } catch (err) {
      console.error('Signup failed:', err);
      alert('Signup failed. Please try again with different credentials.');
    }
  };

  // Handle starting a chat with the entered friend email
  const handleStartChat = async () => {
    if (!friendEmail) return;
    try {
      // (Optional) Fetch friend info by email if needed, e.g., to get friend ID or name
      // const friendRes = await axios.get(`${API_URL}/users?email=${friendEmail}`);
      // const friendData = friendRes.data;
      // setFriend(friendData);

      // Fetch existing messages between current user and the friend
      const res = await axios.get(`${API_URL}/messages`, {
        params: { user: user.id, friend: friendEmail }
      });
      setMessages(res.data || []);  // load chat history (assuming backend returns an array)
      // Mark chat as started by storing friend's info (here just email, could include name/id)
      setFriend({ email: friendEmail });
    } catch (err) {
      console.error('Failed to load messages:', err);
      alert('Could not load chat with the specified user. Please check the email and try again.');
    }
  };

  // Socket.io effect: runs when a chat is active (user and friend are set)
  useEffect(() => {
    if (user && friend) {
      // Connect to Socket.io server
      socketRef.current = io(API_URL);
      console.log('Socket connected:', socketRef.current.id);

      // (Optional) Join a specific room for this two-user chat, if server supports rooms
      // socketRef.current.emit('joinRoom', { userId: user.id, friendId: friend.id });

      // Listen for incoming messages from the server
      socketRef.current.on('message', (messageData) => {
        // Only handle messages relevant to the current chat (assuming messageData has from/to)
        if (
          (messageData.from === user.id && messageData.to === friend.email) ||
          (messageData.from === friend.email && messageData.to === user.id)
        ) {
          setMessages(prevMessages => [...prevMessages, messageData]);
        }
      });

      // Cleanup on component unmount or when user/friend changes: disconnect socket
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          console.log('Socket disconnected');
        }
      };
    }
  }, [user, friend]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msgText = newMessage;
    setNewMessage('');  // clear input field

    // Prepare message object (this structure may vary based on backend)
    const msgData = {
      from: user.id || user.email,      // sender (could use user.id or email)
      to: friend.email,                // recipient (email used here, or use friend.id if available)
      content: msgText,
      timestamp: new Date().toISOString()
    };

    // Optimistically update UI
    setMessages(prevMessages => [...prevMessages, msgData]);

    try {
      // Send to backend via REST API (ensures message is saved in DB before broadcasting)
      await axios.post(`${API_URL}/messages`, msgData);
      // Emit the message over socket for real-time update to friend (if needed)
      if (socketRef.current) {
        socketRef.current.emit('message', msgData);
      }
      // (The server is expected to broadcast this message to the other user via socket)
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Message send failed. Please try again.');
      // Optionally remove the optimistic message or mark it as failed...
    }
  };

  // Inline styles for components
  const containerStyle = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', backgroundColor: '#f0f0f0'
  };
  const panelStyle = {
    backgroundColor: '#fff', padding: '2rem', borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)', width: '300px'
  };
  const inputStyle = {
    width: '100%', padding: '8px', margin: '5px 0', boxSizing: 'border-box'
  };
  const buttonStyle = {
    width: '100%', padding: '10px', margin: '10px 0', cursor: 'pointer'
  };
  const switchTextStyle = { cursor: 'pointer', color: '#007bff' };

  const chatContainerStyle = {
    maxWidth: '600px', width: '100%', margin: '0 auto', 
    display: 'flex', flexDirection: 'column', height: '80vh'
  };
  const chatHeaderStyle = {
    padding: '10px', backgroundColor: '#007bff', color: '#fff',
    borderTopLeftRadius: '8px', borderTopRightRadius: '8px'
  };
  const chatWindowStyle = {
    flex: 1, padding: '10px', backgroundColor: '#e5ddd5', // light beige/green background
    overflowY: 'scroll'
  };
  const inputAreaStyle = {
    display: 'flex', padding: '10px', backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'
  };
  const messageInputStyle = { flex: 1, padding: '8px' };
  const sendBtnStyle = { padding: '8px 16px', marginLeft: '5px', cursor: 'pointer' };

  // Message bubble styles
  const outgoingMsgStyle = {
    alignSelf: 'flex-end', backgroundColor: '#DCF8C6', // light green bubble (like WhatsApp)
    borderRadius: '10px', padding: '8px', margin: '5px', maxWidth: '80%'
  };
  const incomingMsgStyle = {
    alignSelf: 'flex-start', backgroundColor: '#FFFFFF', // white bubble
    borderRadius: '10px', padding: '8px', margin: '5px', maxWidth: '80%',
    border: '1px solid #ccc'
  };

  // Render different screens based on authentication and chat state
  if (!isAuthenticated) {
    // Login or Signup screen
    return (
      <div style={containerStyle}>
        <div style={panelStyle}>
          {isLoginScreen ? (
            <>
              <h2 style={{ textAlign: 'center' }}>Login</h2>
              <input 
                type="email" placeholder="Email" value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} style={inputStyle}
              />
              <input 
                type="password" placeholder="Password" value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} style={inputStyle}
              />
              <button onClick={handleLogin} style={buttonStyle}>Login</button>
              <p style={{ textAlign: 'center' }}>
                Don't have an account?{' '}
                <span style={switchTextStyle} onClick={() => setIsLoginScreen(false)}>
                  Sign up
                </span>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ textAlign: 'center' }}>Sign Up</h2>
              <input 
                type="text" placeholder="Name" value={signupName} 
                onChange={e => setSignupName(e.target.value)} style={inputStyle}
              />
              <input 
                type="email" placeholder="Email" value={signupEmail} 
                onChange={e => setSignupEmail(e.target.value)} style={inputStyle}
              />
              <input 
                type="password" placeholder="Password" value={signupPassword} 
                onChange={e => setSignupPassword(e.target.value)} style={inputStyle}
              />
              <button onClick={handleSignup} style={buttonStyle}>Sign Up</button>
              <p style={{ textAlign: 'center' }}>
                Have an account?{' '}
                <span style={switchTextStyle} onClick={() => setIsLoginScreen(true)}>
                  Login
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // If authenticated but no friend chat started yet, show friend selection
  if (isAuthenticated && !friend) {
    return (
      <div style={containerStyle}>
        <div style={panelStyle}>
          <h3>Welcome, {user?.name || user?.email}!</h3>
          <p>Enter a friend's email to start chatting:</p>
          <input 
            type="email" placeholder="Friend's Email" value={friendEmail} 
            onChange={e => setFriendEmail(e.target.value)} style={inputStyle}
          />
          <button onClick={handleStartChat} style={buttonStyle}>Start Chat</button>
        </div>
      </div>
    );
  }

  // Chat interface (after selecting a friend)
  return (
    <div style={containerStyle}>
      <div style={chatContainerStyle}>
        <div style={chatHeaderStyle}>
          <strong>Chat with {friend.email}</strong>
        </div>
        <div style={chatWindowStyle}>
          {messages.map((msg, index) => (
            <div 
              key={index}
              style={msg.from === (user.id || user.email) ? outgoingMsgStyle : incomingMsgStyle}
            >
              {msg.content}
            </div>
          ))}
          {/* Dummy element to maintain scroll position */}
          <div ref={bottomRef} />
        </div>
        <div style={inputAreaStyle}>
          <input 
            type="text" placeholder="Type a message..." value={newMessage}
            onChange={e => setNewMessage(e.target.value)} style={messageInputStyle}
            onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
          />
          <button onClick={handleSendMessage} style={sendBtnStyle}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
