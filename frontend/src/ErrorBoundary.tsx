import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#c0392b', background: '#fdecea', borderRadius: 8, margin: '2rem' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.errorMessage}</p>
          <button onClick={() => this.setState({ hasError: false, errorMessage: '' })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
