import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import type { Incidencia, Junta } from '@/types/database';

const estadoJuntaLabel: Record<Junta['estado'], string> = {
  convocada: 'Convocada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
};

export default function Inicio() {
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  const [proximasJuntas, setProximasJuntas] = useState<Junta[]>([]);
  const [incidenciasAbiertas, setIncidenciasAbiertas] = useState<Incidencia[]>([]);

  const load = useCallback(async () => {
    const [juntasRes, incidenciasRes] = await Promise.all([
      supabase
        .from('juntas')
        .select('*')
        .neq('estado', 'finalizada')
        .order('fecha', { ascending: true })
        .limit(3),
      supabase.from('incidencias').select('*').eq('estado', 'abierta').limit(5),
    ]);
    setProximasJuntas((juntasRes.data as Junta[] | null) ?? []);
    setIncidenciasAbiertas((incidenciasRes.data as Incidencia[] | null) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <View style={{ gap: Spacing.xs }}>
        <AppText variant="title">Hola{profile?.nombre ? `, ${profile.nombre}` : ''}</AppText>
        <AppText secondary>{isAdmin ? 'Panel de administración' : 'Tu comunidad al día'}</AppText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Próximas juntas</AppText>
        {proximasJuntas.length === 0 ? (
          <EmptyState title="No hay juntas convocadas" />
        ) : (
          proximasJuntas.map((junta) => (
            <Card key={junta.id} onPress={() => router.push(`/juntas/${junta.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{junta.titulo}</AppText>
                <Badge
                  label={estadoJuntaLabel[junta.estado]}
                  tone={junta.estado === 'en_curso' ? 'success' : 'primary'}
                />
              </View>
              <AppText secondary>
                {junta.fecha} · {junta.hora} · {junta.modalidad}
              </AppText>
            </Card>
          ))
        )}
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Incidencias abiertas</AppText>
        {incidenciasAbiertas.length === 0 ? (
          <EmptyState title="Todo tranquilo, sin incidencias abiertas" />
        ) : (
          incidenciasAbiertas.map((inc) => (
            <Card key={inc.id}>
              <AppText variant="subtitle">{inc.titulo}</AppText>
              <AppText secondary numberOfLines={2}>
                {inc.descripcion}
              </AppText>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
