// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] bg-white border border-stone-200 rounded-[28px] p-6 md:p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
            <Clock3 className="w-8 h-8 text-stone-700" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3">
            Cuenta pendiente de aprobación
          </h1>
          <p className="text-sm text-stone-500 mb-5">
            Tu cuenta ya existe, pero algunas funciones seguirán limitadas hasta que el equipo valide el alta.
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-stone-950 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm text-stone-600">
                <p>Recibirás acceso completo cuando el equipo valide tu alta.</p>
                <p>Mientras tanto, algunas funciones comerciales seguirán restringidas.</p>
                <p>Si tarda demasiado, usa contacto o soporte interno.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className="flex h-11 items-center justify-center rounded-full bg-stone-950 px-6 text-[14px] font-medium text-white transition-colors hover:bg-stone-800"
            >
              Volver al inicio
            </Link>
            <Link
              to="/contact"
              className="flex h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-6 text-[14px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Contactar
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
