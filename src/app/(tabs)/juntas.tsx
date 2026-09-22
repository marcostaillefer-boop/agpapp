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
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import type { Junta } from '@/types/database';

const estadoLabel: Record<Junta['estado'], string> = {
  convocada: 'Convocada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
};

const estadoTone: Record<Junta['estado'], 'primary' | 'success' | 'neutral'> = {
  convocada: 'primary',
  en_curso: 'success',
  finalizada: 'neutral',
};

export default function Juntas() {
  const router = useRouter();
  const { can } = useAuth();
  const puedeEditar = can('juntas', 'editar');
  const [juntas, setJuntas] = useState<Junta[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('juntas').select('*').order('fecha', { ascending: false });
    setJuntas((data as Junta[] | null) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <AppText variant="title">Juntas</AppText>
      {puedeEditar ? <Button label="Convocar nueva junta" onPress={() => router.push('/juntas/nueva')} /> : null}

      {juntas.length === 0 ? (
        <EmptyState title="No hay juntas todavía" />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {juntas.map((junta) => (
            <Card key={junta.id} onPress={() => router.push(`/juntas/${junta.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{junta.titulo}</AppText>
                <Badge label={estadoLabel[junta.estado]} tone={estadoTone[junta.estado]} />
              </View>
              <AppText secondary>
                {junta.fecha} · {junta.hora} · {junta.tipo} · {junta.modalidad}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
