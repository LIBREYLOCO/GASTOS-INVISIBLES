'use strict';
const form = document.querySelector('#login-form');
const status = document.querySelector('#status');
const btn = document.querySelector('#submit');
(async () => {
  try {
    const res = await fetch('/auth', { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok && (await res.json()).authenticated) location.replace('/');
  } catch (_) { /* The next form request will show the error. */ }
})();
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  btn.disabled = true;
  try {
    const res = await fetch('/auth', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: document.querySelector('#email').value, password: document.querySelector('#password').value })
    });
    const data = await res.json();
    document.querySelector('#password').value = '';
    if (res.ok && data.authenticated) { location.replace('/'); return; }
    status.textContent = data.error || 'No fue posible iniciar sesion.';
  } catch (_) {
    status.textContent = 'No fue posible conectar con Netlify. Comprueba tu conexion.';
  } finally { btn.disabled = false; }
});
