import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { clearPendingRegistration, getPendingRegistration } from '@/lib/pending-registration';
import type { Empleado, Modulo, NivelPermiso, Profile } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  empleado: Empleado | null;
  administracionId: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isEmpleado: boolean;
  isOwner: boolean;
  /** Personal del despacho en general (super_admin o empleado), sin mirar el módulo. */
  isAdmin: boolean;
  can: (modulo: Modulo, nivel?: NivelPermiso) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NIVEL_RANGO: Record<NivelPermiso, number> = { ninguno: 0, ver: 1, editar: 2 };

/**
 * Cuando alguien se registra con un código pero Supabase exige confirmar el email antes de
 * abrir sesión, el perfil no se puede crear en ese momento (no hay auth.uid() todavía). Aquí
 * completamos ese registro en el primer login, usando los datos guardados localmente.
 */
async function tryCompletePendingRegistration(userId: string): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) return null;

  const pending = await getPendingRegistration(email);
  if (!pending) return null;

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: userId, nombre: pending.nombre, apellidos: pending.apellidos, email, rol: 'propietario' })
    .select()
    .single();

  if (insertError || !created) return null;

  await supabase.rpc('redimir_codigo_acceso', { codigo_input: pending.codigo });
  await clearPendingRegistration(email);

  return created as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [administracionId, setAdministracionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    let profileData = (data as Profile | null) ?? null;

    if (!profileData) {
      profileData = await tryCompletePendingRegistration(userId);
    }

    setProfile(profileData);

    if (profileData?.rol === 'super_admin') {
      const { data: administracion } = await supabase
        .from('administraciones')
        .select('id')
        .eq('propietario_id', userId)
        .maybeSingle();
      setAdministracionId((administracion as { id: string } | null)?.id ?? null);
      setEmpleado(null);
    } else if (profileData?.rol === 'empleado') {
      const { data: empleadoRow } = await supabase
        .from('empleados')
        .select('*')
        .eq('profile_id', userId)
        .eq('activo', true)
        .maybeSingle();
      const empleadoData = (empleadoRow as Empleado | null) ?? null;
      setEmpleado(empleadoData);
      setAdministracionId(empleadoData?.administracion_id ?? null);
    } else {
      setEmpleado(null);
      setAdministracionId(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setEmpleado(null);
        setAdministracionId(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const isSuperAdmin = profile?.rol === 'super_admin';
  const isEmpleado = profile?.rol === 'empleado';
  const isOwner = profile?.rol === 'propietario';

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      empleado,
      administracionId,
      loading,
      isSuperAdmin,
      isEmpleado,
      isOwner,
      isAdmin: isSuperAdmin || isEmpleado,
      can: (modulo: Modulo, nivel: NivelPermiso = 'ver') => {
        if (isSuperAdmin) return true;
        if (isEmpleado) {
          const propio = empleado?.permisos[modulo] ?? 'ninguno';
          return NIVEL_RANGO[propio] >= NIVEL_RANGO[nivel];
        }
        return false;
      },
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (session?.user.id) {
          await loadProfile(session.user.id);
        }
      },
    }),
    [session, profile, empleado, administracionId, loading, isSuperAdmin, isEmpleado, isOwner]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
