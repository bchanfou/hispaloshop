import React, { useState } from 'react';

export default function ImporterProfileForm({ onSubmit }) {
  const [form, setForm] = useState({ company_name: '', country_origin: '', years_experience: 0, specializations: '' });

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.({
      ...form,
      specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
      warehouses: [],
      payment_terms_accepted: ['advance'],
      certifications: {},
      verification_documents: {},
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="w-full border p-2 rounded" placeholder="Empresa" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
      <input className="w-full border p-2 rounded" placeholder="País origen (ES)" value={form.country_origin} onChange={(e) => setForm({ ...form, country_origin: e.target.value.toUpperCase() })} />
      <input className="w-full border p-2 rounded" placeholder="Especializaciones (vino, aceite)" value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} />
      <button className="bg-black text-white rounded px-4 py-2" type="submit">Guardar perfil importador</button>
    </form>
  );
}
