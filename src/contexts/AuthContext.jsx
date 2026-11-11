import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { Building2 } from 'lucide-react';

const AuthContext = createContext(null);

const ERROR_MAP = {
  'Invalid login credentials': 'Email o contraseña incorrectos',
  'User already registered': 'Este email ya está registrado',
  'Email not confirmed': 'Confirma tu email antes de entrar',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  'Password should contain at least one character of each': 'La contraseña debe incluir mayúscula, minúscula y número',
  'New password should be different from the old password': 'La nueva contraseña debe ser distinta de la anterior',
  'Unable to validate email address: invalid format': 'Introduce un email válido',
  'is invalid': 'Introduce un email válido',
  'For security purposes': 'Espera unos segundos antes de volver a intentarlo',
  'over_email_send_rate_limit': 'Demasiados intentos. Espera un momento y prueba de nuevo',
};

function translateError(msg) {
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (msg?.includes(key)) return val;
  }
  return msg ?? 'Ha ocurrido un error';
}

// Usuario ficticio para MODO DEMO
const DEMO_USER = { id: 'demo-user', email: 'demo@rentlog.app', user_metadata: { display_name: 'Anfitrión Demo' } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // El huésped llega desde el enlace del email de recuperación: Supabase abre
  // una sesión y emite PASSWORD_RECOVERY. Mientras esté activo, la app muestra
  // la pantalla de "nueva contraseña" en lugar de la aplicación.
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      // Sin Supabase: entrar directamente como usuario demo
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const register = async (email, password, meta = {}) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta } });
    if (error) throw new Error(translateError(error.message));
    return { needsConfirmation: !data.session };
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateError(error.message));
  };

  // Envía el correo con el enlace de recuperación. Vuelve a la app (origin),
  // donde onAuthStateChange detectará el modo recuperación.
  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(translateError(error.message));
  };

  // Fija la nueva contraseña del usuario ya autenticado por el enlace.
  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(translateError(error.message));
    setRecovery(false);
  };

  const logout = async () => {
    if (isConfigured) await supabase.auth.signOut();
    else setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <Building2 size={28} className="text-teal-500" />
          <div className="w-5 h-5 border-2 border-peach-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isConfigured, recovery, requestPasswordReset, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
