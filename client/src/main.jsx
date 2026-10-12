import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import './index.css';
if (localStorage.theme === 'dark') document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <MotionConfig reducedMotion="user"><App /></MotionConfig>
    <Toaster position="top-right" toastOptions={{ style: { borderRadius: 14, background: 'var(--surface-strong)', color: 'var(--fg)', border: '1px solid var(--line)' } }} />
  </BrowserRouter>
);
