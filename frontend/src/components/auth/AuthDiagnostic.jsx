/**
 * Diagnóstico de Auth en tiempo real
 * Prueba conexión con backend y muestra errores detallados
 */

import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../../utils/api';

const TEST_ENDPOINTS = [
  { name: 'GET /auth/me (sesión)', method: 'get', url: '/auth/me' },
  { name: 'POST /auth/login', method: 'post', url: '/auth/login', data: { email: 'consumer@test.com', password: 'Test1234' } },
  { name: 'POST /auth/register', method: 'post', url: '/auth/register', data: { email: 'test_new@example.com', password: 'Test1234', name: 'Test', role: 'customer', country: 'ES', analytics_consent: true } },
];

export default function AuthDiagnostic() {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const runTest = async (endpoint) => {
    const startTime = Date.now();
    try {
      const response = await axios({
        url: `${API}${endpoint.url}`,
        method: endpoint.method,
        data: endpoint.data,
        withCredentials: true,
        timeout: 10000,
      });
      
      return {
        success: true,
        status: response.status,
        time: Date.now() - startTime,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 'Network Error',
        time: Date.now() - startTime,
        error: error.response?.data?.detail || error.message,
        code: error.code,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    const allResults = [];
    for (const endpoint of TEST_ENDPOINTS) {
      const result = await runTest(endpoint);
      allResults.push({ ...result, name: endpoint.name });
      setResults([...allResults]);
    }
    
    setTesting(false);
  };

  return (
    <div className="fixed top-20 right-4 z-50 bg-white p-4 rounded-xl shadow-xl border border-red-200 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-red-600">🔧 Auth Diagnostic</h3>
        <button
          onClick={runAllTests}
          disabled={testing}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg disabled:opacity-50"
        >
          {testing ? 'Probando...' : 'Test Conexión'}
        </button>
      </div>

      <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
        <strong>API URL:</strong> {API}
      </div>

      {results.length === 0 && !testing && (
        <p className="text-sm text-gray-500">Click "Test Conexión" para diagnosticar</p>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {results.map((result, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg text-sm ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{result.name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                result.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
              }`}>
                {result.status}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Tiempo: {result.time}ms
            </div>
            {result.error && (
              <div className="text-xs text-red-600 mt-1">
                Error: {result.error}
              </div>
            )}
            {result.success && result.data && (
              <div className="text-xs text-green-700 mt-1 truncate">
                Respuesta: {JSON.stringify(result.data).substring(0, 100)}...
              </div>
            )}
          </div>
        ))}
      </div>

      {results.some(r => !r.success && r.code === 'ECONNREFUSED') && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <strong>⚠️ Backend no accesible</strong><br />
          Verifica que el backend esté corriendo en:<br />
          {process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}
        </div>
      )}

      {results.some(r => !r.success && r.status === 404) && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
          <strong>⚠️ Endpoint no encontrado</strong><br />
          El backend responde pero el endpoint no existe.
        </div>
      )}

      {results.some(r => r.success) && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
          <strong>✅ Backend conectado</strong><br />
          La conexión funciona. Revisa los detalles arriba.
        </div>
      )}
    </div>
  );
}
