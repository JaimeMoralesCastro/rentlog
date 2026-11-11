import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Select from './Select.jsx';

// Provincias de España (para el registro). Orden alfabético.
const PROVINCIAS = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
  'Baleares', 'Barcelona', 'Bizkaia', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria',
  'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Gipuzkoa', 'Girona', 'Granada',
  'Guadalajara', 'Huelva', 'Huesca', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas',
  'León', 'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense',
  'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia',
  'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
  'Zamora', 'Zaragoza', 'Ceuta', 'Melilla',
];

// De dónde nos conoció el anfitrión (el "banner" de opciones del registro).
const FUENTES = [
  'Búsqueda en Google', 'Instagram', 'TikTok', 'YouTube',
  'Recomendación de un conocido', 'Grupo o foro de anfitriones',
  'Publicidad online', 'Evento o feria', 'Prensa o blog', 'Otro',
];

// Auth editorial (DESIGN.md): sin cajas, campos con regla inferior, un solo CTA
// naranja con texto tinta, avisos sin tinte de fondo. Cuatro modos.
export default function AuthScreen() {
  const { login, register, requestPasswordReset, updatePassword, recovery } = useAuth();
  const [mode, setMode] = useState(recovery ? 'reset' : 'login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [source, setSource] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Si el enlace de recuperación llega tras montar, saltamos a "nueva contraseña".
  useEffect(() => { if (recovery) setMode('reset'); }, [recovery]);

  const switchMode = (m) => { setMode(m); setMsg(null); };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (!firstName.trim() || !lastName.trim()) throw new Error('Indica tu nombre y apellidos');
        if (!province) throw new Error('Selecciona tu provincia');
        if (!source) throw new Error('Cuéntanos cómo conociste Rentlog');
        const { needsConfirmation } = await register(email, password, {
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          province,
          referral_source: source,
        });
        if (needsConfirmation) {
          setMsg({ ok: true, text: 'Te hemos enviado un correo para confirmar tu cuenta. Revísalo (mira también spam) y pulsa el enlace.' });
        }
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setMsg({ ok: true, text: 'Si ese correo tiene una cuenta, te llega un enlace para restablecer la contraseña.' });
      } else if (mode === 'reset') {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        if (password !== password2) throw new Error('Las contraseñas no coinciden');
        await updatePassword(password);
        setMsg({ ok: true, text: 'Contraseña actualizada. Entrando…' });
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally { setBusy(false); }
  };

  const heading = {
    login: 'Bienvenido de nuevo.',
    register: 'Crea tu cuenta.',
    forgot: 'Recupera el acceso.',
    reset: 'Nueva contraseña.',
  }[mode];

  const sub = {
    login: 'Analítica para anfitriones de Airbnb y Booking.',
    register: 'Unos datos para preparar tu panel.',
    forgot: 'Te enviamos un enlace para volver a entrar.',
    reset: 'Elige una contraseña nueva para tu cuenta.',
  }[mode];

  const submitLabel = {
    login: 'Entrar',
    register: 'Crear cuenta',
    forgot: 'Enviar enlace',
    reset: 'Guardar contraseña',
  }[mode];

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] animate-slide-up">
        <p className="text-eyebrow mb-3">Rentlog</p>
        <h1 className="text-[34px] font-display tracking-tightest text-ink-900 leading-[1.05]">{heading}</h1>
        <p className="text-[13px] text-ink-500 mt-2 mb-8">{sub}</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <input className="field" type="text" required autoComplete="given-name" aria-label="Nombre"
                placeholder="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input className="field" type="text" required autoComplete="family-name" aria-label="Apellidos"
                placeholder="Apellidos" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          )}

          {mode !== 'reset' && (
            <input className="field" type="email" required autoComplete="email" aria-label="Email"
              placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          )}

          {mode === 'register' && (
            <>
              <Select value={province} onChange={setProvince} options={PROVINCIAS} placeholder="Provincia" />
              <Select value={source} onChange={setSource} options={FUENTES} placeholder="¿Cómo conociste Rentlog?" />
            </>
          )}

          {mode !== 'forgot' && (
            <input className="field" type="password" required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-label="Contraseña"
              placeholder={mode === 'reset' ? 'Nueva contraseña' : 'Contraseña'}
              value={password} onChange={e => setPassword(e.target.value)} />
          )}

          {mode === 'reset' && (
            <input className="field" type="password" required autoComplete="new-password" aria-label="Repite la contraseña"
              placeholder="Repite la contraseña" value={password2} onChange={e => setPassword2(e.target.value)} />
          )}

          {mode === 'login' && (
            <div className="-mt-1">
              <button type="button" className="action" onClick={() => switchMode('forgot')}>Olvidé mi contraseña</button>
            </div>
          )}

          <button disabled={busy} className="cta w-full mt-1 disabled:opacity-40">
            {busy ? 'Procesando…' : submitLabel}
          </button>
        </form>

        {msg && (
          <div className="mt-6 hair-top pt-4 animate-fade-in">
            <p className="label mb-1">{msg.ok ? 'Hecho' : 'Revisa'}</p>
            <p className="text-[13px] text-ink-900 leading-relaxed">{msg.text}</p>
          </div>
        )}

        {mode === 'login' && (
          <p className="mt-6 text-[12.5px] text-ink-500">
            ¿No tienes cuenta?
            <button onClick={() => switchMode('register')} className="ml-1.5 sublink text-ink-900">Regístrate</button>
          </p>
        )}
        {mode === 'register' && (
          <p className="mt-6 text-[12.5px] text-ink-500">
            ¿Ya tienes cuenta?
            <button onClick={() => switchMode('login')} className="ml-1.5 sublink text-ink-900">Entra</button>
          </p>
        )}
        {mode === 'forgot' && (
          <p className="mt-6 text-[12.5px] text-ink-500">
            <button onClick={() => switchMode('login')} className="sublink text-ink-900">Volver al inicio de sesión</button>
          </p>
        )}

        <p className="mt-10 pt-6 hair-top text-[11.5px] text-ink-500 leading-relaxed">
          <span className="text-ink-900 font-medium">Tus datos son solo tuyos.</span> No los compartimos ni los vendemos. Cada cuenta está aislada con seguridad por usuario.
        </p>
      </div>
    </div>
  );
}
