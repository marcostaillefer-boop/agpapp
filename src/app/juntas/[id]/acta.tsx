import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Share, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Comunidad, Junta, PuntoOrdenDia } from '@/types/database';

function generarTextoActa(junta: Junta, comunidad: Comunidad | null, puntos: PuntoOrdenDia[]) {
  const lineas = [
    `ACTA DE JUNTA - ${junta.titulo}`,
    comunidad ? `Comunidad: ${comunidad.nombre}` : '',
    `Fecha: ${junta.fecha} ${junta.hora}`,
    `Tipo: ${junta.tipo} · Modalidad: ${junta.modalidad}`,
    '',
    'ORDEN DEL DÍA Y ACUERDOS:',
  ];

  puntos.forEach((punto) => {
    lineas.push(`\n${punto.orden}. ${punto.titulo}`);
    if (punto.descripcion) lineas.push(punto.descripcion);
    if (punto.resultado) {
      lineas.push(
        `Resultado: ${punto.resultado.aprobado ? 'APROBADO' : 'NO APROBADO'} — A favor ${punto.resultado.coeficiente_a_favor.toFixed(1)}% · En contra ${punto.resultado.coeficiente_en_contra.toFixed(1)}% · Abstención ${punto.resultado.coeficiente_abstencion.toFixed(1)}% (${punto.resultado.votos_emitidos} votos emitidos)`
      );
    } else if (!punto.requiere_votacion) {
      lineas.push('Punto informativo, sin votación.');
    }
  });

  return lineas.filter(Boolean).join('\n');
}

export default function ActaJunta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [junta, setJunta] = useState<Junta | null>(null);
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [puntos, setPuntos] = useState<PuntoOrdenDia[]>([]);

  const load = useCallback(async () => {
    const juntaRes = await supabase.from('juntas').select('*').eq('id', id).single();
    const juntaData = (juntaRes.data as Junta | null) ?? null;
    setJunta(juntaData);

    const puntosRes = await supabase.from('puntos_orden_dia').select('*').eq('junta_id', id).order('orden');
    setPuntos((puntosRes.data as PuntoOrdenDia[] | null) ?? []);

    if (juntaData) {
      const comunidadRes = await supabase.from('comunidades').select('*').eq('id', juntaData.comunidad_id).single();
      setComunidad((comunidadRes.data as Comunidad | null) ?? null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!junta) {
    return (
      <Screen>
        <EmptyState title="Cargando acta..." />
      </Screen>
    );
  }

  const compartir = () => {
    Share.share({ title: junta.titulo, message: generarTextoActa(junta, comunidad, puntos) });
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Acta de la junta' }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="title">{junta.titulo}</AppText>
        <AppText secondary>{comunidad?.nombre}</AppText>
        <AppText secondary>
          {junta.fecha} · {junta.hora}
        </AppText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        {puntos.map((punto) => (
          <Card key={punto.id}>
            <AppText variant="subtitle">
              {punto.orden}. {punto.titulo}
            </AppText>
            {punto.descripcion ? <AppText secondary>{punto.descripcion}</AppText> : null}
            {punto.resultado ? (
              <>
                <Badge
                  label={punto.resultado.aprobado ? 'Aprobado' : 'No aprobado'}
                  tone={punto.resultado.aprobado ? 'success' : 'danger'}
                />
                <AppText secondary>
                  A favor {punto.resultado.coeficiente_a_favor.toFixed(1)}% · En contra{' '}
                  {punto.resultado.coeficiente_en_contra.toFixed(1)}% · Abstención{' '}
                  {punto.resultado.coeficiente_abstencion.toFixed(1)}%
                </AppText>
                <AppText variant="caption" secondary>
                  {punto.resultado.votos_emitidos} voto(s) emitido(s)
                </AppText>
              </>
            ) : (
              <AppText variant="caption" secondary>
                Punto informativo
              </AppText>
            )}
          </Card>
        ))}
      </View>

      <Button label="Compartir acta" onPress={compartir} />
    </Screen>
  );
}
