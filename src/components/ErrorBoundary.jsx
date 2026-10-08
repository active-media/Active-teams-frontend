import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('💥 Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            backgroundColor: 'background.default'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: 2
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
               Something Went Wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              The application encountered an unexpected error. Don't worry, your data is safe.
            </Typography>

            {this.state.error && (
              <Box 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.100', 
                  borderRadius: 1,
                  mb: 2,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }}
              >
                <Typography variant="caption">
                  Error: {this.state.error.toString()}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                onClick={this.handleReload}
                size="large"
              >
                Reload Page
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={this.handleReset}
                size="large"
              >
                Try Again
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              If the problem persists, please contact support.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;