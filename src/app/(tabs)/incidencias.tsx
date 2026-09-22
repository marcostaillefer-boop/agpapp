import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Incidencia } from '@/types/database';

const estadoLabel: Record<Incidencia['estado'], string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  cerrada: 'Cerrada',
};

const estadoTone: Record<Incidencia['estado'], 'danger' | 'warning' | 'success'> = {
  abierta: 'danger',
  en_proceso: 'warning',
  cerrada: 'success',
};

export default function Incidencias() {
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('incidencias')
      .select('*')
      .order('created_at', { ascending: false });
    setIncidencias((data as Incidencia[] | null) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <AppText variant="title">Incidencias</AppText>
      <Button label="Nueva incidencia" onPress={() => router.push('/incidencias/nueva')} />

      {incidencias.length === 0 ? (
        <EmptyState title="No hay incidencias registradas" />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {incidencias.map((inc) => (
            <Card key={inc.id} onPress={() => router.push(`/incidencias/${inc.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{inc.titulo}</AppText>
                <Badge label={estadoLabel[inc.estado]} tone={estadoTone[inc.estado]} />
              </View>
              <AppText secondary numberOfLines={2}>
                {inc.descripcion}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
