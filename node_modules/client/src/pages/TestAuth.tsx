import React, { useState } from 'react';
import { authAPI } from '../services/api';
export function TestAuth() {
  const [phone, setPhone] = useState('+998943333395');
  const [password, setPassword] = useState('1234');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const handleTestSignin = async () => {
    setLoading(true);
    setResult('');
    try {
      console.log('Тестируем вход с:', { phone, password });
      const response = await authAPI.signin(phone, password);
      setResult(`Успех! Получены токены: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('Ошибка входа:', error);
      setResult(`Ошибка: ${error.message}\nДетали: ${JSON.stringify(error.data, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Тест авторизации</h2>
      <div style={{ marginBottom: '10px' }}>
        <label>Телефон:</label>
        <input 
          type="text" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Пароль:</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <button 
        onClick={handleTestSignin} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Тестируем...' : 'Тест входа'}
      </button>
      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {result}
        </div>
      )}
    </div>
  );
}
export default TestAuth;