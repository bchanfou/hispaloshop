import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16">
        <div className="bg-white border border-stone-200 rounded-3xl p-8 md:p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock3 className="w-8 h-8 text-amber-700" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Cuenta pendiente de aprobacion
          </h1>
          <p className="text-text-muted max-w-xl mx-auto mb-6">
            Tu cuenta ya existe, pero algunas funciones seguiran limitadas hasta que el equipo valide el alta.
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-left max-w-xl mx-auto mb-8">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#2D5A27] mt-0.5" />
              <div className="space-y-1 text-sm text-text-secondary">
                <p>Recibiras acceso completo cuando el equipo valide tu alta.</p>
                <p>Mientras tanto, algunas funciones comerciales seguiran restringidas.</p>
                <p>Si tarda demasiado, usa contacto o soporte interno.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white">
              <Link to="/">Volver al inicio</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contactar</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
