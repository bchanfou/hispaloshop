/**
 * Script de diagnóstico de estado de red
 * Verifica el sistema de detección de conectividad
 */

const API_URL = 'https://api.hispaloshop.com';

async function checkEndpoint(endpoint, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return { success: response.ok, status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);
    return { success: false, error: error.name };
  }
}

async function diagnoseNetwork() {
  console.log('=' .repeat(60));
  console.log('DIAGNÓSTICO DE ESTADO DE RED');
  console.log('=' .repeat(60));
  console.log('');
  
  // 1. Estado del navegador
  console.log('1. Estado del Navegador');
  console.log(`   navigator.onLine: ${navigator.onLine}`);
  console.log(`   connection type: ${navigator.connection?.effectiveType || 'N/A'}`);
  console.log(`   connection downlink: ${navigator.connection?.downlink || 'N/A'} Mbps`);
  console.log('');
  
  // 2. Ping a backend
  console.log('2. Conectividad con Backend');
  const health = await checkEndpoint('/health');
  console.log(`   /health: ${health.success ? '✅ OK' : '❌ FALLIDO'} ${health.status || health.error}`);
  
  const forYou = await checkEndpoint('/api/feed/foryou?limit=1');
  console.log(`   /api/feed/foryou: ${forYou.success ? '✅ OK' : '❌ FALLIDO'} ${forYou.status || forYou.error}`);
  console.log('');
  
  // 3. Verificar localStorage
  console.log('3. Almacenamiento Local');
  let cacheItems = 0;
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i)?.startsWith('hispaloshop_')) {
      cacheItems++;
    }
  }
  console.log(`   Items en cache: ${cacheItems}`);
  console.log(`   Espacio usado: ${JSON.stringify(localStorage).length / 1024} KB`);
  console.log('');
  
  // 4. Verificar Cache API
  console.log('4. Cache API');
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log(`   Caches disponibles: ${cacheNames.length}`);
    cacheNames.forEach(name => console.log(`     - ${name}`));
  } else {
    console.log('   Cache API no disponible');
  }
  console.log('');
  
  // 5. Service Worker
  console.log('5. Service Worker');
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`   SW registrados: ${registrations.length}`);
    registrations.forEach(sw => console.log(`     - ${sw.scope}`));
  } else {
    console.log('   Service Workers no soportados');
  }
  console.log('');
  
  // Resumen
  console.log('=' .repeat(60));
  console.log('RESUMEN');
  console.log('=' .repeat(60));
  
  if (health.success) {
    console.log('✅ Backend accesible');
  } else {
    console.log('❌ No se puede conectar al backend');
    console.log('   El indicador offline debería mostrarse');
    console.log(`   ${cacheItems > 0 ? '✅ Hay contenido cacheado disponible' : '⚠️ No hay contenido cacheado'}`);
  }
  console.log('');
}

// Ejecutar si se corre directamente
if (typeof window !== 'undefined') {
  diagnoseNetwork();
}

export { diagnoseNetwork };
