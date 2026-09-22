import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Cuota, Vivienda } from '@/types/database';

const estadoTone: Record<Cuota['estado'], 'success' | 'warning' | 'danger'> = {
  pagada: 'success',
  pendiente: 'warning',
  vencida: 'danger',
};

const estadoLabel: Record<Cuota['estado'], string> = {
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
};

export default function CuotasComunidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [viviendas, setViviendas] = useState<Record<string, Vivienda>>({});

  const load = useCallback(async () => {
    const [cuotasRes, viviendasRes] = await Promise.all([
      supabase
        .from('cuotas')
        .select('*')
        .eq('comunidad_id', id)
        .order('periodo', { ascending: false }),
      supabase.from('viviendas').select('*').eq('comunidad_id', id),
    ]);
    setCuotas((cuotasRes.data as Cuota[] | null) ?? []);
    const map: Record<string, Vivienda> = {};
    ((viviendasRes.data as Vivienda[] | null) ?? []).forEach((v) => {
      map[v.id] = v;
    });
    setViviendas(map);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Cuotas' }} />
      {cuotas.length === 0 ? (
        <EmptyState title="Sin cuotas registradas todavía" />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {cuotas.map((cuota) => (
            <Card key={cuota.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{viviendas[cuota.vivienda_id]?.identificador ?? 'Vivienda'}</AppText>
                <Badge label={estadoLabel[cuota.estado]} tone={estadoTone[cuota.estado]} />
              </View>
              <AppText secondary>
                {cuota.concepto} · {cuota.periodo}
              </AppText>
              <AppText variant="subtitle">{cuota.importe.toFixed(2)} €</AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
