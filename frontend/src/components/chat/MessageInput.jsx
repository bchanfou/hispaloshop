import React, { useState } from 'react';

export default function MessageInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <form onSubmit={submit} className="border-t p-3 flex gap-2">
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onTyping?.(Boolean(e.target.value));
        }}
        className="flex-1 border rounded-lg px-3 py-2"
        placeholder="Escribe un mensaje..."
      />
      <button className="bg-emerald-600 text-white px-4 rounded-lg" type="submit">Enviar</button>
    </form>
  );
}
