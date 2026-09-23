import { useCallback, useState } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Empleado, Fichaje, SolicitudAusencia, TipoAusencia } from '@/types/database';

const TIPOS_AUSENCIA: { value: TipoAusencia; label: string }[] = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'dia_libre', label: 'Día libre' },
  { value: 'baja', label: 'Baja' },
  { value: 'otro', label: 'Otro' },
];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function aFecha(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function estadoSolicitud(s: SolicitudAusencia, necesitaPresidente: boolean) {
  if (s.rechazada) return { label: 'Rechazada', tone: 'danger' as const };
  const aprobadaFinal = s.aprobado_admin && (!necesitaPresidente || s.aprobado_presidente);
  if (aprobadaFinal) return { label: 'Aprobada', tone: 'success' as const };
  if (s.aprobado_admin || s.aprobado_presidente) return { label: 'Aprobación parcial', tone: 'warning' as const };
  return { label: 'Pendiente', tone: 'neutral' as const };
}

export default function FichajeScreen() {
  const theme = useTheme();
  const { profile } = useAuth();

  const [fichajesHoy, setFichajesHoy] = useState<Fichaje[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudAusencia[]>([]);
  const [miEmpleado, setMiEmpleado] = useState<Empleado | null>(null);
  const [fichando, setFichando] = useState(false);
  const [mostrarSolicitud, setMostrarSolicitud] = useState(false);
  const [tipo, setTipo] = useState<TipoAusencia>('vacaciones');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [mostrarInicio, setMostrarInicio] = useState(false);
  const [mostrarFin, setMostrarFin] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [fichajesRes, solicitudesRes, empleadoRes] = await Promise.all([
      supabase
        .from('fichajes')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('hora', inicioHoy.toISOString())
        .order('hora', { ascending: true }),
      supabase
        .from('solicitudes_ausencia')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('empleados').select('*').eq('profile_id', profile.id).maybeSingle(),
    ]);
    setFichajesHoy((fichajesRes.data as Fichaje[] | null) ?? []);
    setSolicitudes((solicitudesRes.data as SolicitudAusencia[] | null) ?? []);
    setMiEmpleado((empleadoRes.data as Empleado | null) ?? null);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ultimoFichaje = fichajesHoy[fichajesHoy.length - 1];
  const tocaFichar = !ultimoFichaje || ultimoFichaje.tipo === 'salida' ? 'entrada' : 'salida';

  const fichar = async () => {
    if (!profile) return;
    setFichando(true);
    await supabase.from('fichajes').insert({ profile_id: profile.id, tipo: tocaFichar });
    setFichando(false);
    await load();
  };

  const solicitarAusencia = async () => {
    if (!profile) return;
    setEnviando(true);
    await supabase.from('solicitudes_ausencia').insert({
      profile_id: profile.id,
      tipo,
      fecha_inicio: aFecha(fechaInicio),
      fecha_fin: aFecha(fechaFin),
      motivo: motivo.trim() || null,
    });
    setEnviando(false);
    setMostrarSolicitud(false);
    setMotivo('');
    await load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Fichaje' }} />

      <Card>
        <AppText variant="subtitle">Registro horario de hoy</AppText>
        {fichajesHoy.length === 0 ? (
          <AppText secondary>Todavía no has fichado hoy.</AppText>
        ) : (
          fichajesHoy.map((f) => (
            <AppText key={f.id} secondary>
              {f.tipo === 'entrada' ? 'Entrada' : 'Salida'}:{' '}
              {new Date(f.hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </AppText>
          ))
        )}
        <Button
          label={tocaFichar === 'entrada' ? 'Fichar entrada' : 'Fichar salida'}
          onPress={fichar}
          loading={fichando}
        />
      </Card>

      {!mostrarSolicitud ? (
        <Button label="Solicitar vacaciones o día libre" variant="secondary" onPress={() => setMostrarSolicitud(true)} />
      ) : (
        <Card>
          <AppText variant="subtitle">Nueva solicitud</AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
            {TIPOS_AUSENCIA.map((t) => {
              const activo = tipo === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setTipo(t.value)}
                  style={{
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 6,
                    borderRadius: Radius.pill,
                    backgroundColor: activo ? theme.primary : theme.surface,
                    borderWidth: 1,
                    borderColor: activo ? theme.primary : theme.border,
                  }}
                >
                  <AppText variant="caption" color={activo ? theme.primaryText : theme.text}>
                    {t.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label={`Desde ${aFecha(fechaInicio)}`} variant="secondary" style={{ flex: 1 }} onPress={() => setMostrarInicio(true)} />
            <Button label={`Hasta ${aFecha(fechaFin)}`} variant="secondary" style={{ flex: 1 }} onPress={() => setMostrarFin(true)} />
          </View>
          {mostrarInicio ? (
            <DateTimePicker
              value={fechaInicio}
              mode="date"
              onChange={(_, d) => {
                setMostrarInicio(false);
                if (d) setFechaInicio(d);
              }}
            />
          ) : null}
          {mostrarFin ? (
            <DateTimePicker
              value={fechaFin}
              mode="date"
              onChange={(_, d) => {
                setMostrarFin(false);
                if (d) setFechaFin(d);
              }}
            />
          ) : null}

          <TextField label="Motivo (opcional)" value={motivo} onChangeText={setMotivo} placeholder="Motivo personal" />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Enviar solicitud" onPress={solicitarAusencia} loading={enviando} style={{ flex: 1 }} />
            <Button label="Cancelar" variant="secondary" onPress={() => setMostrarSolicitud(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Mis solicitudes</AppText>
        {solicitudes.length === 0 ? (
          <EmptyState title="No has hecho ninguna solicitud" />
        ) : (
          solicitudes.map((s) => {
            const estado = estadoSolicitud(s, !!miEmpleado?.comunidad_id);
            return (
              <Card key={s.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="subtitle">{TIPOS_AUSENCIA.find((t) => t.value === s.tipo)?.label}</AppText>
                  <Badge label={estado.label} tone={estado.tone} />
                </View>
                <AppText secondary>
                  {s.fecha_inicio} → {s.fecha_fin}
                </AppText>
                {s.motivo ? <AppText secondary variant="caption">{s.motivo}</AppText> : null}
                {s.rechazada && s.motivo_rechazo ? (
                  <AppText variant="caption" color={theme.danger}>
                    Motivo del rechazo: {s.motivo_rechazo}
                  </AppText>
                ) : null}
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
