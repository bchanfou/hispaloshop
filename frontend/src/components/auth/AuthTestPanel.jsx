/**
 * Panel de prueba para verificar autenticación
 * Usar solo en desarrollo
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../lib/authApi';
import { toast } from 'sonner';

const TEST_ACCOUNTS = [
  { email: 'consumer@test.com', password: 'Test1234', role: 'customer', name: 'Consumidor' },
  { email: 'producer@test.com', password: 'Test1234', role: 'producer', name: 'Productor' },
  { email: 'influencer@test.com', password: 'Test1234', role: 'influencer', name: 'Influencer' },
  { email: 'importer@test.com', password: 'Test1234', role: 'importer', name: 'Importador' },
  { email: 'admin@test.com', password: 'Test1234', role: 'admin', name: 'Admin' },
  { email: 'superadmin@test.com', password: 'Test1234', role: 'super_admin', name: 'SuperAdmin' },
];

export default function AuthTestPanel() {
  const { login, logout, user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);

  const testLogin = async (account) => {
    try {
      const response = await login({
        email: account.email,
        password: account.password,
      });
      
      await logout(); // Limpiar después de probar
      
      return {
        success: true,
        account: account.name,
        role: response?.user?.role,
        userId: response?.user?.user_id,
      };
    } catch (error) {
      return {
        success: false,
        account: account.name,
        error: error?.response?.data?.detail || error.message,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    toast.info('Iniciando pruebas de autenticación...');
    
    const testResults = [];
    
    for (const account of TEST_ACCOUNTS) {
      const result = await testLogin(account);
      testResults.push(result);
      
      if (result.success) {
        toast.success(`${account.name}: ✅ OK`);
      } else {
        toast.error(`${account.name}: ❌ ${result.error}`);
      }
    }
    
    setResults(testResults);
    setTesting(false);
  };

  const testCurrentUser = async () => {
    try {
      const user = await authApi.getCurrentUser();
      toast.success('Usuario actual obtenido', {
        description: `${user.name} (${user.role})`,
      });
    } catch (error) {
      toast.error('Error obteniendo usuario actual', {
        description: error?.response?.data?.detail || error.message,
      });
    }
  };

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-2xl shadow-xl border border-stone-200 max-w-sm">
      <h3 className="font-bold text-sm mb-2">🔧 Auth Test Panel (Dev Only)</h3>
      
      {user && (
        <div className="mb-3 p-2 bg-stone-50 rounded text-xs">
          <strong>Sesión activa:</strong><br />
          {user.email} ({user.role})
        </div>
      )}
      
      <div className="space-y-2">
        <button
          onClick={runAllTests}
          disabled={testing}
          className="w-full px-3 py-2 bg-stone-950 text-white text-xs rounded-2xl hover:bg-stone-800 disabled:opacity-50"
        >
          {testing ? 'Probando...' : 'Probar todas las cuentas'}
        </button>
        
        <button
          onClick={testCurrentUser}
          className="w-full px-3 py-2 bg-stone-100 text-stone-700 text-xs rounded-2xl hover:bg-stone-200"
        >
          Ver usuario actual
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="mt-3 space-y-1">
          <h4 className="text-xs font-semibold">Resultados:</h4>
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`text-xs p-1.5 rounded ${
                result.success ? 'bg-stone-50 text-stone-700' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {result.success ? '✅' : '❌'} {result.account}
              {result.success && ` (${result.role})`}
              {!result.success && `: ${result.error}`}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 pt-2 border-t border-stone-100">
        <p className="text-[10px] text-stone-400">
          Cuentas de prueba disponibles:
        </p>
        <div className="mt-1 space-y-0.5">
          {TEST_ACCOUNTS.map((acc) => (
            <div key={acc.email} className="text-[10px] text-stone-500">
              {acc.name}: {acc.email}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
