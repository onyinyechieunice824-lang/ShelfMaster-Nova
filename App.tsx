import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('pos_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('pos_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pos_current_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Layout user={user} onLogout={handleLogout} />;
};

export default App;
