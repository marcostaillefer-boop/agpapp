import { useCallback, useState } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Profile, SolicitudAusencia, TipoAusencia } from '@/types/database';

const TIPO_LABEL: Record<TipoAusencia, string> = {
  vacaciones: 'Vacaciones',
  dia_libre: 'Día libre',
  baja: 'Baja',
  otro: 'Otro',
};

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAusencia[]>([]);
  const [perfiles, setPerfiles] = useState<Record<string, Profile>>({});
  const [respondiendo, setRespondiendo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('solicitudes_ausencia')
      .select('*')
      .order('created_at', { ascending: false });
    const lista = (data as SolicitudAusencia[] | null) ?? [];
    setSolicitudes(lista);

    const ids = Array.from(new Set(lista.map((s) => s.profile_id)));
    if (ids.length > 0) {
      const { data: perfilesData } = await supabase.from('profiles').select('*').in('id', ids);
      const mapa: Record<string, Profile> = {};
      ((perfilesData as Profile[] | null) ?? []).forEach((p) => {
        mapa[p.id] = p;
      });
      setPerfiles(mapa);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const responder = async (solicitud: SolicitudAusencia, aprobar: boolean) => {
    setRespondiendo(solicitud.id);
    await supabase.rpc('responder_solicitud_ausencia', {
      solicitud: solicitud.id,
      aprobar,
      motivo: null,
    });
    setRespondiendo(null);
    await load();
  };

  const pendientes = solicitudes.filter((s) => !s.rechazada && !(s.aprobado_admin && s.aprobado_presidente));
  const resueltas = solicitudes.filter((s) => s.rechazada || (s.aprobado_admin && s.aprobado_presidente));

  const renderSolicitud = (s: SolicitudAusencia, accionable: boolean) => (
    <Card key={s.id}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="subtitle">{perfiles[s.profile_id]?.nombre ?? 'Empleado'}</AppText>
        <Badge label={TIPO_LABEL[s.tipo]} tone="primary" />
      </View>
      <AppText secondary>
        {s.fecha_inicio} → {s.fecha_fin}
      </AppText>
      {s.motivo ? <AppText secondary variant="caption">{s.motivo}</AppText> : null}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
        {s.aprobado_admin ? <Badge label="Administración ✓" tone="success" /> : null}
        {s.aprobado_presidente ? <Badge label="Presidente ✓" tone="success" /> : null}
        {s.rechazada ? <Badge label="Rechazada" tone="danger" /> : null}
      </View>
      {accionable ? (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
          <Button
            label="Aprobar"
            style={{ flex: 1 }}
            onPress={() => responder(s, true)}
            loading={respondiendo === s.id}
          />
          <Button
            label="Rechazar"
            variant="danger"
            style={{ flex: 1 }}
            onPress={() => responder(s, false)}
            loading={respondiendo === s.id}
          />
        </View>
      ) : null}
    </Card>
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Solicitudes de ausencia' }} />

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Pendientes</AppText>
        {pendientes.length === 0 ? (
          <EmptyState title="No hay solicitudes pendientes" />
        ) : (
          pendientes.map((s) => renderSolicitud(s, true))
        )}
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle" secondary>
          Resueltas
        </AppText>
        {resueltas.length === 0 ? (
          <AppText secondary variant="caption">
            Todavía no hay solicitudes resueltas.
          </AppText>
        ) : (
          resueltas.map((s) => renderSolicitud(s, false))
        )}
      </View>
    </Screen>
  );
}
