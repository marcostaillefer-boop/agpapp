import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Image, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Radius, Spacing } from '@/constants/theme';
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

      {incidencia.foto_url ? (
        <Image
          source={{ uri: incidencia.foto_url }}
          style={{ width: '100%', height: 220, borderRadius: Radius.lg }}
        />
      ) : null}

      {incidencia.latitud != null && incidencia.longitud != null ? (
        <Card
          onPress={() =>
            WebBrowser.openBrowserAsync(
              `https://www.google.com/maps/search/?api=1&query=${incidencia.latitud},${incidencia.longitud}`
            )
          }
        >
          <AppText variant="subtitle">Ver ubicación en el mapa</AppText>
          <AppText secondary variant="caption">
            {incidencia.latitud.toFixed(5)}, {incidencia.longitud.toFixed(5)}
          </AppText>
        </Card>
      ) : incidencia.ubicacion_texto ? (
        <Card>
          <AppText variant="subtitle">Ubicación</AppText>
          <AppText secondary>{incidencia.ubicacion_texto}</AppText>
        </Card>
      ) : null}

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
