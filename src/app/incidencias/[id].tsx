import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import type { EstadoIncidencia, Incidencia } from '@/types/database';

const estados: { value: EstadoIncidencia; label: string }[] = [
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrada', label: 'Cerrada' },
];

export default function DetalleIncidencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const puedeEditar = can('incidencias', 'editar');
  const [incidencia, setIncidencia] = useState<Incidencia | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('incidencias').select('*').eq('id', id).single();
    setIncidencia((data as Incidencia | null) ?? null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cambiarEstado = async (estado: EstadoIncidencia) => {
    setUpdating(true);
    await supabase.from('incidencias').update({ estado }).eq('id', id);
    await load();
    setUpdating(false);
  };

  if (!incidencia) {
    return (
      <Screen>
        <EmptyState title="Cargando incidencia..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Incidencia' }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="title">{incidencia.titulo}</AppText>
        <Badge label={estados.find((e) => e.value === incidencia.estado)?.label ?? ''} tone="primary" />
      </View>
      <AppText>{incidencia.descripcion}</AppText>

      {puedeEditar ? (
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="subtitle">Cambiar estado</AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {estados.map((estado) => (
              <Button
                key={estado.value}
                label={estado.label}
                variant={incidencia.estado === estado.value ? 'primary' : 'secondary'}
                onPress={() => cambiarEstado(estado.value)}
                disabled={updating}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
