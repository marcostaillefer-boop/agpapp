import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, Share, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type {
  Asistente,
  Comunidad,
  Cuota,
  EstadoPunto,
  Junta,
  PuntoOrdenDia,
  SentidoInstruccion,
  Vivienda,
} from '@/types/database';

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

const SENTIDOS: { value: SentidoInstruccion; label: string }[] = [
  { value: 'a_favor', label: 'A favor' },
  { value: 'en_contra', label: 'En contra' },
  { value: 'abstencion', label: 'Abstención' },
  { value: 'libre', label: 'Libre' },
];

function generarConvocatoria(
  junta: Junta,
  comunidad: Comunidad,
  puntos: PuntoOrdenDia[],
  viviendasMorosas: Vivienda[]
) {
  const lineas = [
    `CONVOCATORIA DE JUNTA ${junta.tipo === 'ordinaria' ? 'ORDINARIA' : 'EXTRAORDINARIA'} DE PROPIETARIOS`,
    '',
    `Comunidad: ${comunidad.nombre}`,
    `Domicilio: ${comunidad.direccion}`,
    '',
    `Por orden de la Presidencia, se convoca a los propietarios de la Comunidad "${comunidad.nombre}" a la Junta ${junta.tipo} que se celebrará el día ${junta.fecha} a las ${junta.hora} horas, ${
      junta.modalidad === 'online'
        ? `de forma telemática${junta.enlace_online ? ` (${junta.enlace_online})` : ''}`
        : junta.modalidad === 'mixta'
          ? `de forma presencial en ${junta.lugar ?? 'el lugar habitual'} y también de forma telemática${junta.enlace_online ? ` (${junta.enlace_online})` : ''}`
          : `en ${junta.lugar ?? 'el lugar habitual'}`
    }, en primera convocatoria, con arreglo al siguiente`,
    '',
    'ORDEN DEL DÍA',
  ];

  puntos.forEach((punto) => {
    lineas.push(`${punto.orden}. ${punto.titulo}`);
    if (punto.descripcion) lineas.push(`   ${punto.descripcion}`);
  });

  lineas.push('', 'RUEGOS Y PREGUNTAS');

  if (viviendasMorosas.length > 0) {
    lineas.push(
      '',
      'PROPIETARIOS DEUDORES',
      'De conformidad con el artículo 15.2 de la Ley de Propiedad Horizontal, los propietarios que no estén al corriente de pago de la totalidad de las deudas vencidas con la comunidad podrán participar en las deliberaciones si bien no tendrán derecho de voto, salvo que abonen lo adeudado, lo impugnen judicialmente o procedan a la consignación judicial o notarial de la suma adeudada antes del comienzo de la junta. Se encuentran en esta situación las siguientes viviendas:',
      ...viviendasMorosas.map((v) => `- ${v.identificador}`)
    );
  }

  return lineas.join('\n');
}

export default function DetalleJunta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { profile, isOwner, can } = useAuth();
  const puedeEditar = can('juntas', 'editar');

  const [junta, setJunta] = useState<Junta | null>(null);
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [puntos, setPuntos] = useState<PuntoOrdenDia[]>([]);
  const [miVivienda, setMiVivienda] = useState<Vivienda | null>(null);
  const [miAsistencia, setMiAsistencia] = useState<Asistente | null>(null);
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [viviendasMorosas, setViviendasMorosas] = useState<Vivienda[]>([]);
  const [busy, setBusy] = useState(false);
  const [mostrarDelegacion, setMostrarDelegacion] = useState(false);
  const [representanteNombre, setRepresentanteNombre] = useState('');
  const [instrucciones, setInstrucciones] = useState<Record<string, SentidoInstruccion>>({});

  const load = useCallback(async () => {
    const juntaRes = await supabase.from('juntas').select('*').eq('id', id).single();
    const juntaData = (juntaRes.data as Junta | null) ?? null;
    setJunta(juntaData);

    const [puntosRes, asistentesRes] = await Promise.all([
      supabase.from('puntos_orden_dia').select('*').eq('junta_id', id).order('orden'),
      supabase.from('asistentes').select('*').eq('junta_id', id),
    ]);
    const listaPuntos = (puntosRes.data as PuntoOrdenDia[] | null) ?? [];
    setPuntos(listaPuntos);
    const listaAsistentes = (asistentesRes.data as Asistente[] | null) ?? [];
    setAsistentes(listaAsistentes);

    if (juntaData) {
      const comunidadRes = await supabase.from('comunidades').select('*').eq('id', juntaData.comunidad_id).single();
      setComunidad((comunidadRes.data as Comunidad | null) ?? null);

      const [viviendasRes, cuotasRes] = await Promise.all([
        supabase.from('viviendas').select('*').eq('comunidad_id', juntaData.comunidad_id),
        supabase.from('cuotas').select('*').eq('comunidad_id', juntaData.comunidad_id).eq('estado', 'vencida'),
      ]);
      const listaViviendas = (viviendasRes.data as Vivienda[] | null) ?? [];
      const idsMorosos = new Set(((cuotasRes.data as Cuota[] | null) ?? []).map((c) => c.vivienda_id));
      setViviendasMorosas(listaViviendas.filter((v) => idsMorosos.has(v.id)));

      if (profile) {
        const vivienda = listaViviendas.find((v) => v.propietario_id === profile.id) ?? null;
        setMiVivienda(vivienda);
        setMiAsistencia(listaAsistentes.find((a) => a.vivienda_id === vivienda?.id) ?? null);
      }
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

  const abrirDelegacion = () => {
    const inicial: Record<string, SentidoInstruccion> = {};
    puntos
      .filter((p) => p.requiere_votacion)
      .forEach((p) => {
        inicial[p.id] = 'libre';
      });
    setInstrucciones(inicial);
    setMostrarDelegacion(true);
  };

  const enviarDelegacion = async () => {
    if (!miVivienda || !profile || !representanteNombre.trim()) return;
    setBusy(true);
    await supabase.from('asistentes').insert({
      junta_id: id,
      vivienda_id: miVivienda.id,
      propietario_id: profile.id,
      modalidad: 'online',
      representada: true,
      representante_nombre: representanteNombre.trim(),
      instrucciones_voto: instrucciones,
    });
    setBusy(false);
    setMostrarDelegacion(false);
    await load();
  };

  const compartirConvocatoria = () => {
    if (!junta || !comunidad) return;
    Share.share({
      title: `Convocatoria — ${junta.titulo}`,
      message: generarConvocatoria(junta, comunidad, puntos, viviendasMorosas),
    });
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
  const puntosVotables = puntos.filter((p) => p.requiere_votacion);

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
        <Button label="Ver convocatoria" variant="secondary" onPress={compartirConvocatoria} />
      </View>

      {isOwner && miVivienda && !miAsistencia && junta.estado !== 'finalizada' && !mostrarDelegacion ? (
        <Card>
          <AppText variant="subtitle">Registra tu asistencia</AppText>
          <AppText secondary>
            Confirma cómo vas a participar en esta junta como propietario de {miVivienda.identificador}.
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
            <Button label="Presencial" style={{ flex: 1 }} onPress={() => registrarAsistencia('presencial')} disabled={busy} />
            <Button label="Online" variant="secondary" style={{ flex: 1 }} onPress={() => registrarAsistencia('online')} disabled={busy} />
          </View>
          {puntosVotables.length > 0 ? (
            <Pressable onPress={abrirDelegacion} style={{ marginTop: Spacing.sm }}>
              <AppText variant="caption" color={theme.primary}>
                No puedo asistir, quiero delegar mi voto
              </AppText>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {isOwner && mostrarDelegacion ? (
        <Card>
          <AppText variant="subtitle">Delegación de voto</AppText>
          <AppText secondary>
            Indica quién te representará (puede ser otro propietario, la administración o cualquier otra persona) y,
            si quieres, cómo debe votar en cada punto.
          </AppText>
          <TextField
            label="Nombre del representante"
            value={representanteNombre}
            onChangeText={setRepresentanteNombre}
            placeholder="Nombre y apellidos"
          />
          {puntosVotables.map((punto) => (
            <View key={punto.id} style={{ gap: Spacing.xs }}>
              <AppText variant="caption" secondary>
                {punto.orden}. {punto.titulo}
              </AppText>
              <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
                {SENTIDOS.map((sentido) => {
                  const activo = instrucciones[punto.id] === sentido.value;
                  return (
                    <Pressable
                      key={sentido.value}
                      onPress={() => setInstrucciones((prev) => ({ ...prev, [punto.id]: sentido.value }))}
                      style={{
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 6,
                        borderRadius: Radius.pill,
                        backgroundColor: activo ? theme.primary : theme.surface,
                        borderWidth: 1,
                        borderColor: activo ? theme.primary : theme.border,
                      }}
                    >
                      <AppText variant="caption" color={activo ? theme.primaryText : theme.text}>
                        {sentido.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Delegar voto" onPress={enviarDelegacion} loading={busy} style={{ flex: 1 }} />
            <Button label="Cancelar" variant="secondary" onPress={() => setMostrarDelegacion(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      {isOwner && miAsistencia ? (
        <Card>
          <AppText secondary>
            {miAsistencia.representada
              ? `Voto delegado en ${miAsistencia.representante_nombre}.`
              : `Asistencia registrada como ${miAsistencia.modalidad === 'presencial' ? 'presencial' : 'online'}.`}
          </AppText>
        </Card>
      ) : null}

      {puedeEditar ? (
        <Card>
          <AppText variant="subtitle">Panel de la junta</AppText>
          <AppText secondary>{asistentes.length} vivienda(s) registrada(s) como asistentes.</AppText>
          {viviendasMorosas.length > 0 ? (
            <AppText variant="caption" secondary>
              {viviendasMorosas.length} vivienda(s) sin derecho a voto por impago (art. 15.2 LPH).
            </AppText>
          ) : null}
          {junta.estado === 'convocada' ? (
            <Button label="Iniciar junta" onPress={iniciarJunta} disabled={busy} />
          ) : null}
          {junta.estado === 'en_curso' && puntosPendientes.length === 0 ? (
            <Button label="Finalizar junta y generar acta" onPress={finalizarJunta} disabled={busy} />
          ) : null}
          <Button
            label="Listado de propietarios y votos"
            variant="secondary"
            onPress={() => router.push(`/juntas/${id}/listado`)}
          />
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
            {puedeEditar && punto.requiere_votacion && punto.estado === 'pendiente' && junta.estado === 'en_curso' ? (
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
