import { useCallback, useEffect, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { VoteBar } from '@/components/vote-bar';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Junta, OpcionVoto, PuntoOrdenDia, Vivienda, Voto } from '@/types/database';

interface Tally {
  aFavor: number;
  enContra: number;
  abstencion: number;
  total: number;
  votosEmitidos: number;
}

function calcularTally(votos: Voto[], viviendasPorId: Record<string, Vivienda>): Tally {
  let aFavor = 0;
  let enContra = 0;
  let abstencion = 0;
  votos.forEach((voto) => {
    const coeficiente = viviendasPorId[voto.vivienda_id]?.coeficiente ?? 0;
    if (voto.opcion === 'a_favor') aFavor += coeficiente;
    else if (voto.opcion === 'en_contra') enContra += coeficiente;
    else abstencion += coeficiente;
  });
  return { aFavor, enContra, abstencion, total: aFavor + enContra + abstencion, votosEmitidos: votos.length };
}

export default function PuntoVotacion() {
  const { id, puntoId } = useLocalSearchParams<{ id: string; puntoId: string }>();
  const theme = useTheme();
  const { profile, isOwner, can } = useAuth();
  const puedeEditar = can('juntas', 'editar');

  const [punto, setPunto] = useState<PuntoOrdenDia | null>(null);
  const [junta, setJunta] = useState<Junta | null>(null);
  const [miVivienda, setMiVivienda] = useState<Vivienda | null>(null);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [viviendasPorId, setViviendasPorId] = useState<Record<string, Vivienda>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const puntoRes = await supabase.from('puntos_orden_dia').select('*').eq('id', puntoId).single();
    const puntoData = (puntoRes.data as PuntoOrdenDia | null) ?? null;
    setPunto(puntoData);

    const juntaRes = await supabase.from('juntas').select('*').eq('id', id).single();
    const juntaData = (juntaRes.data as Junta | null) ?? null;
    setJunta(juntaData);

    if (juntaData) {
      const viviendasRes = await supabase.from('viviendas').select('*').eq('comunidad_id', juntaData.comunidad_id);
      const map: Record<string, Vivienda> = {};
      ((viviendasRes.data as Vivienda[] | null) ?? []).forEach((v) => {
        map[v.id] = v;
      });
      setViviendasPorId(map);

      if (profile) {
        setMiVivienda(Object.values(map).find((v) => v.propietario_id === profile.id) ?? null);
      }
    }

    const votosRes = await supabase.from('votos').select('*').eq('punto_id', puntoId);
    setVotos((votosRes.data as Voto[] | null) ?? []);
  }, [id, puntoId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const channel = supabase
      .channel(`votos-${puntoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votos', filter: `punto_id=eq.${puntoId}` },
        () => {
          supabase
            .from('votos')
            .select('*')
            .eq('punto_id', puntoId)
            .then(({ data }) => setVotos((data as Voto[] | null) ?? []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [puntoId]);

  const yaHeVotado = miVivienda ? votos.some((v) => v.vivienda_id === miVivienda.id) : false;

  const votar = async (opcion: OpcionVoto) => {
    if (!miVivienda || !profile) return;
    setBusy(true);
    await supabase.from('votos').insert({
      punto_id: puntoId,
      vivienda_id: miVivienda.id,
      propietario_id: profile.id,
      opcion,
    });
    setBusy(false);
  };

  const cerrarVotacion = async () => {
    setBusy(true);
    await supabase.rpc('cerrar_votacion', { punto: puntoId });
    await load();
    setBusy(false);
  };

  if (!punto || !junta) {
    return (
      <Screen>
        <EmptyState title="Cargando punto..." />
      </Screen>
    );
  }

  const tally = punto.resultado
    ? {
        aFavor: punto.resultado.coeficiente_a_favor,
        enContra: punto.resultado.coeficiente_en_contra,
        abstencion: punto.resultado.coeficiente_abstencion,
        total: punto.resultado.coeficiente_total,
        votosEmitidos: punto.resultado.votos_emitidos,
      }
    : calcularTally(votos, viviendasPorId);

  const totalComunidad = Object.values(viviendasPorId).reduce((acc, v) => acc + v.coeficiente, 0) || 100;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: `${junta.titulo} · Punto ${punto.orden}` }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="title">{punto.titulo}</AppText>
        {punto.descripcion ? <AppText secondary>{punto.descripcion}</AppText> : null}
        <Badge
          label={
            punto.estado === 'en_votacion' ? 'Votación en curso' : punto.estado === 'cerrado' ? 'Votación cerrada' : 'Pendiente'
          }
          tone={punto.estado === 'en_votacion' ? 'success' : 'neutral'}
        />
      </View>

      {punto.estado === 'en_votacion' && isOwner ? (
        miVivienda ? (
          !miVivienda.derecho_voto ? (
            <Card>
              <AppText secondary>Tu vivienda no tiene derecho a voto en esta comunidad.</AppText>
            </Card>
          ) : yaHeVotado ? (
            <Card>
              <AppText secondary>Ya has emitido tu voto para este punto. Gracias.</AppText>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              <AppText variant="subtitle">Tu voto ({miVivienda.identificador})</AppText>
              <Button label="A favor" onPress={() => votar('a_favor')} disabled={busy} />
              <Button label="En contra" variant="danger" onPress={() => votar('en_contra')} disabled={busy} />
              <Button label="Abstención" variant="secondary" onPress={() => votar('abstencion')} disabled={busy} />
            </View>
          )
        ) : (
          <Card>
            <AppText secondary>No estás registrado como propietario con derecho a voto en esta comunidad.</AppText>
          </Card>
        )
      ) : null}

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Recuento {punto.estado === 'cerrado' ? 'final' : 'en directo'}</AppText>
        <AppText secondary>
          {tally.votosEmitidos} voto(s) emitido(s) · {tally.total.toFixed(1)}% del coeficiente total ha votado
        </AppText>
        <VoteBar label="A favor" percent={(tally.aFavor / totalComunidad) * 100} color={theme.success} />
        <VoteBar label="En contra" percent={(tally.enContra / totalComunidad) * 100} color={theme.danger} />
        <VoteBar label="Abstención" percent={(tally.abstencion / totalComunidad) * 100} color={theme.textSecondary} />
      </View>

      {punto.resultado ? (
        <Badge label={punto.resultado.aprobado ? 'Punto aprobado' : 'Punto no aprobado'} tone={punto.resultado.aprobado ? 'success' : 'danger'} />
      ) : null}

      {puedeEditar && punto.estado === 'en_votacion' ? (
        <Button label="Cerrar votación y pasar a acta" onPress={cerrarVotacion} disabled={busy} />
      ) : null}
    </Screen>
  );
}
