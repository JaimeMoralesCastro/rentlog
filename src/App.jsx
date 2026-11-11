import { useState } from 'react';
import { useAuth } from './contexts/AuthContext.jsx';
import { useRentlogData } from './hooks/useRentlogData.js';
import { displayName } from './lib/supabase.js';
import SiteNav from './components/SiteNav.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import Dashboard from './components/Dashboard.jsx';
import Properties from './components/Properties.jsx';
import Reservations from './components/Reservations.jsx';
import Cleaning from './components/Cleaning.jsx';
import GuestHub from './components/GuestHub.jsx'; // Guía + Mensajes fusionados en una página
import Finance from './components/Finance.jsx';
import PredictionsHub from './components/PredictionsHub.jsx'; // Tarifas + Predicciones fusionadas
// APARCADAS 2026-07-27: Web (landing) y Reseñas retiradas de la navegación por
// petición del usuario. Componentes intactos; reactivar = descomentar estos
// imports, sus rutas más abajo y sus entradas en SiteNav.jsx.
// import LandingPreview from './components/LandingPreview.jsx';
// import Reviews from './components/Reviews.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import ConnectBusiness from './components/ConnectBusiness.jsx';
import { useScrollFx } from './hooks/useScrollFx.js';
import { useIsPremium } from './lib/premium.js';

export default function App() {
  const { user, logout, isConfigured, recovery } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [connectPropertyId, setConnectPropertyId] = useState(null); // propiedad a conectar (desde el banner de importación)
  const [autoImport, setAutoImport] = useState(false); // abrir el modal de importación al llegar a Reservas
  const data = useRentlogData(user?.id);
  const viewRef = useScrollFx([tab, data.loading]);
  const premium = useIsPremium(user?.id);
  const [showConnectBiz, setShowConnectBiz] = useState(false);

  // Lleva a la ficha de la propiedad para conectar su calendario (iCal).
  const goToConnect = (propertyId) => { setConnectPropertyId(propertyId || null); setTab('properties'); };
  // Lleva a Reservas y abre directamente la importación del histórico.
  const goToImport = () => { setAutoImport(true); setTab('reservations'); };
  // Lleva a la sección de Propiedades.
  const goToProperties = () => setTab('properties');

  // Con Supabase configurado y sin sesión → login. En modo demo entra directo.
  // En recuperación (enlace del email) mostramos la pantalla de nueva contraseña
  // aunque exista sesión temporal.
  if (isConfigured && (recovery || !user)) return <AuthScreen />;

  return (
    <div className="min-h-screen min-h-dvh bg-bg text-ink-900 flex flex-col">
      <SiteNav active={tab} onChange={setTab} onLogout={logout} demo={!isConfigured} />

      <main className="flex-1">
        {data.loading ? (
          <div className="page py-40">
            <p className="label">Cargando</p>
          </div>
        ) : (
        <div key={tab} ref={viewRef} className="animate-page-in">
        {tab === 'dashboard' ? (
          <Dashboard data={data} displayName={displayName(user)} onImportHistory={goToImport} onConnect={() => goToConnect(data.properties[0]?.id ?? null)} onAddProperty={goToProperties} onConnectBusiness={() => setShowConnectBiz(true)} />
        ) : tab === 'properties' ? (
          <Properties data={data} autoEditId={connectPropertyId} onConsumeAutoEdit={() => setConnectPropertyId(null)} onConnectBusiness={() => setShowConnectBiz(true)} />
        ) : tab === 'reservations' ? (
          <Reservations data={data} onGoToConnect={goToConnect} autoOpenImport={autoImport} onConsumeAutoOpenImport={() => setAutoImport(false)} />
        ) : tab === 'cleaning' ? (
          <Cleaning data={data} />
        ) : tab === 'guidebook' ? (
          <GuestHub data={data} />
        ) : tab === 'finance' ? (
          <Finance data={data} onEditProperty={goToConnect} />
        ) : tab === 'analytics' ? (
          <PredictionsHub data={data} />
        ) : (
          /* APARCADAS: 'landing' → <LandingPreview/> y 'reviews' → <Reviews/> */
          <Dashboard data={data} displayName={displayName(user)} onImportHistory={goToImport} onConnect={() => goToConnect(data.properties[0]?.id ?? null)} onAddProperty={goToProperties} onConnectBusiness={() => setShowConnectBiz(true)} />
        )}
        </div>
        )}
      </main>

      <SiteFooter />

      {showConnectBiz && (
        <ConnectBusiness data={data} premium={premium} onClose={() => setShowConnectBiz(false)} />
      )}
    </div>
  );
}
