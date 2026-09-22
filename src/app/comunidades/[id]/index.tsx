import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import type { Comunidad, Vivienda } from '@/types/database';

export default function ComunidadDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);

  const load = useCallback(async () => {
    const [comunidadRes, viviendasRes] = await Promise.all([
      supabase.from('comunidades').select('*').eq('id', id).single(),
      supabase.from('viviendas').select('*').eq('comunidad_id', id).order('identificador'),
    ]);
    setComunidad((comunidadRes.data as Comunidad | null) ?? null);
    setViviendas((viviendasRes.data as Vivienda[] | null) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!comunidad) {
    return (
      <Screen>
        <EmptyState title="Cargando comunidad..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: comunidad.nombre }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="title">{comunidad.nombre}</AppText>
        <AppText secondary>{comunidad.direccion}</AppText>
        {comunidad.cif ? <AppText secondary>CIF: {comunidad.cif}</AppText> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
        <Card style={{ flexGrow: 1 }} onPress={() => router.push(`/comunidades/${id}/cuotas`)}>
          <AppText variant="subtitle">Cuotas</AppText>
          <AppText secondary>Ver estado de pagos</AppText>
        </Card>
        <Card style={{ flexGrow: 1 }} onPress={() => router.push(`/comunidades/${id}/documentos`)}>
          <AppText variant="subtitle">Documentos</AppText>
          <AppText secondary>Actas y convocatorias</AppText>
        </Card>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">
          {isAdmin ? 'Viviendas y propietarios' : 'Viviendas de la comunidad'}
        </AppText>
        {viviendas.length === 0 ? (
          <EmptyState title="Todavía no hay viviendas registradas" />
        ) : (
          viviendas.map((vivienda) => (
            <Card key={vivienda.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{vivienda.identificador}</AppText>
                <AppText secondary>{vivienda.coeficiente}%</AppText>
              </View>
              {!vivienda.derecho_voto ? (
                <AppText variant="caption" secondary>
                  Sin derecho a voto
                </AppText>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
