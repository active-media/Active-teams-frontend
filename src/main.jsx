import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import AuthProvider from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { TaskUpdateProvider } from './contexts/TaskUpdateContext';
import { OrgConfigProvider } from './contexts/OrgConfigContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TaskUpdateProvider>
      <ErrorBoundary>
        <AuthProvider>
          <UserProvider>
            <OrgConfigProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </OrgConfigProvider>
          </UserProvider>
        </AuthProvider>
      </ErrorBoundary>
    </TaskUpdateProvider>
  </React.StrictMode>
);