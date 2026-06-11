import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { BookOpen } from 'lucide-react';
import type { AuthResponse } from '../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      
      const { token, userName, userEmail } = response.data;
      login(token, userName, userEmail);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        setError(String((err.response.data as Record<string, unknown>).message));
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', marginBottom: '1rem' }}>
            <BookOpen size={32} />
          </div>
          <h1>Bem-vindo ao StudyFlow</h1>
          <p>Faça login para gerenciar seus estudos</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="seu-email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Não tem uma conta?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
