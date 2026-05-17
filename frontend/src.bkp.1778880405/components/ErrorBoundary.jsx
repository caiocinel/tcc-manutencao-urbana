import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          padding: '24px',
          textAlign: 'center',
          gap: '12px',
        }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Algo deu errado</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginTop: 8 }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
