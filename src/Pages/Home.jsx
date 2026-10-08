import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Snackbar, Alert } from '@mui/material';

const Home = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Check if we should show the welcome message
    const shouldShow = localStorage.getItem('showWelcome');
    const name = localStorage.getItem('welcomeUserName');
    
    if (shouldShow === 'true') {
      setUserName(name || 'User');
      setShowWelcome(true);
      
      // Clear the flags immediately so it doesn't show again
      localStorage.removeItem('showWelcome');
      localStorage.removeItem('welcomeUserName');
    }
  }, []);

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowWelcome(false);
  };

  return (
    <div>
      <Header />
      
      {/* Welcome Back Snackbar For When A User Logs In Successfully */}
      <Snackbar
        open={showWelcome}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            backgroundColor: '#4caf50',
            '& .MuiAlert-icon': {
              fontSize: '2rem',
            },
          }}
        >
          Welcome back, {userName}!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Home;

