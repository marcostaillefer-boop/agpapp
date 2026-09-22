import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
import type { Asistente, EstadoPunto, Junta, PuntoOrdenDia, Vivienda } from '@/types/database';

const puntoEstadoLabel: Record<EstadoPunto, string> = {
  pendiente: 'Pendiente',
  en_votacion: 'Votación en curso',
  cerrado: 'Cerrado',
};

const puntoEstadoTone: Record<EstadoPunto, 'neutral' | 'success' | 'warning'> = {
  pendiente: 'neutral',
  en_votacion: 'success',
  cerrado: 'neutral',
};

export default function DetalleJunta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, isAdmin } = useAuth();

  const [junta, setJunta] = useState<Junta | null>(null);
  const [puntos, setPuntos] = useState<PuntoOrdenDia[]>([]);
  const [miVivienda, setMiVivienda] = useState<Vivienda | null>(null);
  const [miAsistencia, setMiAsistencia] = useState<Asistente | null>(null);
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const juntaRes = await supabase.from('juntas').select('*').eq('id', id).single();
    const juntaData = (juntaRes.data as Junta | null) ?? null;
    setJunta(juntaData);

    const [puntosRes, asistentesRes] = await Promise.all([
      supabase.from('puntos_orden_dia').select('*').eq('junta_id', id).order('orden'),
      supabase.from('asistentes').select('*').eq('junta_id', id),
    ]);
    setPuntos((puntosRes.data as PuntoOrdenDia[] | null) ?? []);
    const listaAsistentes = (asistentesRes.data as Asistente[] | null) ?? [];
    setAsistentes(listaAsistentes);

    if (profile && juntaData) {
      const viviendaRes = await supabase
        .from('viviendas')
        .select('*')
        .eq('comunidad_id', juntaData.comunidad_id)
        .eq('propietario_id', profile.id)
        .maybeSingle();
      const vivienda = (viviendaRes.data as Vivienda | null) ?? null;
      setMiVivienda(vivienda);
      setMiAsistencia(listaAsistentes.find((a) => a.vivienda_id === vivienda?.id) ?? null);
    }
  }, [id, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const registrarAsistencia = async (modalidad: 'presencial' | 'online') => {
    if (!miVivienda || !profile) return;
    setBusy(true);
    await supabase.from('asistentes').insert({
      junta_id: id,
      vivienda_id: miVivienda.id,
      propietario_id: profile.id,
      modalidad,
    });
    await load();
    setBusy(false);
  };

  const iniciarJunta = async () => {
    setBusy(true);
    await supabase.from('juntas').update({ estado: 'en_curso' }).eq('id', id);
    await load();
    setBusy(false);
  };

  const abrirVotacion = async (puntoId: string) => {
    setBusy(true);
    await supabase.rpc('abrir_votacion', { punto: puntoId });
    await load();
    setBusy(false);
    router.push(`/juntas/${id}/punto/${puntoId}`);
  };

  const finalizarJunta = async () => {
    setBusy(true);
    await supabase.from('juntas').update({ estado: 'finalizada' }).eq('id', id);
    await load();
    setBusy(false);
  };

  if (!junta) {
    return (
      <Screen>
        <EmptyState title="Cargando junta..." />
      </Screen>
    );
  }

  const puntosPendientes = puntos.filter((p) => p.requiere_votacion && p.estado !== 'cerrado');

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: junta.titulo }} />

      <View style={{ gap: Spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="title">{junta.titulo}</AppText>
          <Badge
            label={junta.estado === 'convocada' ? 'Convocada' : junta.estado === 'en_curso' ? 'En curso' : 'Finalizada'}
            tone={junta.estado === 'en_curso' ? 'success' : junta.estado === 'finalizada' ? 'neutral' : 'primary'}
          />
        </View>
        <AppText secondary>
          {junta.fecha} · {junta.hora} · {junta.tipo} · {junta.modalidad}
        </AppText>
        {junta.lugar ? <AppText secondary>Lugar: {junta.lugar}</AppText> : null}
        {junta.enlace_online ? (
          <Button
            label="Unirse a la videollamada"
            variant="secondary"
            onPress={() => WebBrowser.openBrowserAsync(junta.enlace_online!)}
          />
        ) : null}
      </View>

      {!isAdmin && miVivienda && !miAsistencia && junta.estado !== 'finalizada' ? (
        <Card>
          <AppText variant="subtitle">Registra tu asistencia</AppText>
          <AppText secondary>
            Confirma cómo vas a participar en esta junta como propietario de {miVivienda.identificador}.
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
            <Button label="Presencial" style={{ flex: 1 }} onPress={() => registrarAsistencia('presencial')} disabled={busy} />
            <Button label="Online" variant="secondary" style={{ flex: 1 }} onPress={() => registrarAsistencia('online')} disabled={busy} />
          </View>
        </Card>
      ) : null}

      {!isAdmin && miAsistencia ? (
        <Card>
          <AppText secondary>
            Asistencia registrada como {miAsistencia.modalidad === 'presencial' ? 'presencial' : 'online'}.
          </AppText>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <AppText variant="subtitle">Panel de la junta</AppText>
          <AppText secondary>{asistentes.length} vivienda(s) registrada(s) como asistentes.</AppText>
          {junta.estado === 'convocada' ? (
            <Button label="Iniciar junta" onPress={iniciarJunta} disabled={busy} />
          ) : null}
          {junta.estado === 'en_curso' && puntosPendientes.length === 0 ? (
            <Button label="Finalizar junta y generar acta" onPress={finalizarJunta} disabled={busy} />
          ) : null}
        </Card>
      ) : null}

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Orden del día</AppText>
        {puntos.map((punto) => (
          <Card
            key={punto.id}
            onPress={
              punto.estado === 'en_votacion' || punto.estado === 'cerrado'
                ? () => router.push(`/juntas/${id}/punto/${punto.id}`)
                : undefined
            }
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="subtitle">
                {punto.orden}. {punto.titulo}
              </AppText>
              {punto.requiere_votacion ? (
                <Badge label={puntoEstadoLabel[punto.estado]} tone={puntoEstadoTone[punto.estado]} />
              ) : (
                <Badge label="Informativo" tone="neutral" />
              )}
            </View>
            {punto.descripcion ? <AppText secondary>{punto.descripcion}</AppText> : null}
            {punto.resultado ? (
              <AppText secondary>
                {punto.resultado.aprobado ? 'Aprobado' : 'No aprobado'} · A favor {punto.resultado.coeficiente_a_favor.toFixed(1)}%
              </AppText>
            ) : null}
            {isAdmin && punto.requiere_votacion && punto.estado === 'pendiente' && junta.estado === 'en_curso' ? (
              <Button label="Abrir votación de este punto" onPress={() => abrirVotacion(punto.id)} disabled={busy} />
            ) : null}
          </Card>
        ))}
      </View>

      {junta.estado === 'finalizada' ? (
        <Button label="Ver acta de la junta" onPress={() => router.push(`/juntas/${id}/acta`)} />
      ) : null}
    </Screen>
  );
}
