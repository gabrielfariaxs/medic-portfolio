"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || 'Senha incorreta');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <form onSubmit={handleLogin} style={{ background: 'var(--surface)', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 22px rgba(20,22,31,.06)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Área Restrita</h2>
        
        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
            placeholder="admin@arthromed.com.br"
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-2)' }}>Senha</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
            placeholder="Digite a senha"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: 'var(--grad)', color: '#fff', borderRadius: '999px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Entrando...' : 'Entrar no Painel'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ fontSize: '13px', color: 'var(--azul)', fontWeight: 600, textDecoration: 'none' }}>&larr; Voltar ao site</a>
        </div>
      </form>
    </div>
  );
}
