import { useCallback, useState, type ReactNode } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Asistente, Cuota, Junta, OpcionVoto, PuntoOrdenDia, Vivienda, Voto } from '@/types/database';

const VOTO_LABEL: Record<OpcionVoto, string> = {
  a_favor: 'A favor',
  en_contra: 'En contra',
  abstencion: 'Abst.',
};

function Cell({ width, children }: { width: number; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ width, paddingVertical: 8, paddingHorizontal: 6, borderRightWidth: 1, borderColor: theme.border }}>
      {typeof children === 'string' ? <AppText variant="caption">{children}</AppText> : children}
    </View>
  );
}

export default function ListadoJunta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [junta, setJunta] = useState<Junta | null>(null);
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [morosos, setMorosos] = useState<Set<string>>(new Set());
  const [puntos, setPuntos] = useState<PuntoOrdenDia[]>([]);
  const [votos, setVotos] = useState<Voto[]>([]);

  const load = useCallback(async () => {
    const juntaRes = await supabase.from('juntas').select('*').eq('id', id).single();
    const juntaData = (juntaRes.data as Junta | null) ?? null;
    setJunta(juntaData);
    if (!juntaData) return;

    const [viviendasRes, asistentesRes, cuotasRes, puntosRes] = await Promise.all([
      supabase.from('viviendas').select('*').eq('comunidad_id', juntaData.comunidad_id).order('identificador'),
      supabase.from('asistentes').select('*').eq('junta_id', id),
      supabase.from('cuotas').select('*').eq('comunidad_id', juntaData.comunidad_id).eq('estado', 'vencida'),
      supabase.from('puntos_orden_dia').select('*').eq('junta_id', id).eq('requiere_votacion', true).order('orden'),
    ]);

    const listaViviendas = (viviendasRes.data as Vivienda[] | null) ?? [];
    setViviendas(listaViviendas);
    setAsistentes((asistentesRes.data as Asistente[] | null) ?? []);
    setMorosos(new Set(((cuotasRes.data as Cuota[] | null) ?? []).map((c) => c.vivienda_id)));
    const listaPuntos = (puntosRes.data as PuntoOrdenDia[] | null) ?? [];
    setPuntos(listaPuntos);

    if (listaPuntos.length > 0) {
      const votosRes = await supabase
        .from('votos')
        .select('*')
        .in('punto_id', listaPuntos.map((p) => p.id));
      setVotos((votosRes.data as Voto[] | null) ?? []);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const votoDe = (viviendaId: string, puntoId: string) =>
    votos.find((v) => v.vivienda_id === viviendaId && v.punto_id === puntoId);

  const exportarCsv = () => {
    const cabecera = [
      'Vivienda',
      'Propietario',
      'Coeficiente',
      'Deudor',
      'Asistencia',
      'Representante',
      ...puntos.map((p) => `Punto ${p.orden}`),
    ];
    const filas = viviendas.map((vivienda) => {
      const asistencia = asistentes.find((a) => a.vivienda_id === vivienda.id);
      const asistenciaTexto = asistencia
        ? asistencia.representada
          ? 'Representada'
          : asistencia.modalidad === 'presencial'
            ? 'Presencial'
            : 'Online'
        : 'Ausente';
      return [
        vivienda.identificador,
        vivienda.nombre_propietario ?? '',
        String(vivienda.coeficiente),
        morosos.has(vivienda.id) ? 'Sí' : 'No',
        asistenciaTexto,
        asistencia?.representante_nombre ?? '',
        ...puntos.map((p) => {
          const voto = votoDe(vivienda.id, p.id);
          return voto ? VOTO_LABEL[voto.opcion] : '';
        }),
      ];
    });
    const csv = [cabecera, ...filas].map((fila) => fila.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    Share.share({ title: `Listado — ${junta?.titulo ?? ''}`, message: csv });
  };

  if (!junta) {
    return (
      <Screen>
        <EmptyState title="Cargando listado..." />
      </Screen>
    );
  }

  const colVivienda = 90;
  const colPropietario = 140;
  const colCoef = 70;
  const colDeudor = 70;
  const colAsistencia = 100;
  const colRepresentante = 130;
  const colVoto = 100;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Listado de propietarios' }} />
      <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
        <Button label="Compartir como CSV" onPress={exportarCsv} variant="secondary" />
      </View>

      {viviendas.length === 0 ? (
        <EmptyState title="No hay viviendas en esta comunidad" />
      ) : (
        <ScrollView horizontal style={{ flex: 1 }}>
          <ScrollView>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
              <Cell width={colVivienda}>
                <AppText variant="label">Vivienda</AppText>
              </Cell>
              <Cell width={colPropietario}>
                <AppText variant="label">Propietario</AppText>
              </Cell>
              <Cell width={colCoef}>
                <AppText variant="label">Coef.</AppText>
              </Cell>
              <Cell width={colDeudor}>
                <AppText variant="label">Deudor</AppText>
              </Cell>
              <Cell width={colAsistencia}>
                <AppText variant="label">Asistencia</AppText>
              </Cell>
              <Cell width={colRepresentante}>
                <AppText variant="label">Representante</AppText>
              </Cell>
              {puntos.map((p) => (
                <Cell key={p.id} width={colVoto}>
                  <AppText variant="label">Punto {p.orden}</AppText>
                </Cell>
              ))}
            </View>

            {viviendas.map((vivienda, index) => {
              const asistencia = asistentes.find((a) => a.vivienda_id === vivienda.id);
              return (
                <View
                  key={vivienda.id}
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: index % 2 === 0 ? theme.background : theme.surface,
                  }}
                >
                  <Cell width={colVivienda}>{vivienda.identificador}</Cell>
                  <Cell width={colPropietario}>{vivienda.nombre_propietario ?? '—'}</Cell>
                  <Cell width={colCoef}>{`${vivienda.coeficiente}%`}</Cell>
                  <Cell width={colDeudor}>{morosos.has(vivienda.id) ? 'Sí' : 'No'}</Cell>
                  <Cell width={colAsistencia}>
                    {asistencia ? (asistencia.representada ? 'Representada' : asistencia.modalidad) : 'Ausente'}
                  </Cell>
                  <Cell width={colRepresentante}>{asistencia?.representante_nombre ?? '—'}</Cell>
                  {puntos.map((punto) => {
                    const voto = votoDe(vivienda.id, punto.id);
                    return (
                      <Cell key={punto.id} width={colVoto}>
                        {voto ? VOTO_LABEL[voto.opcion] : '—'}
                      </Cell>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </ScrollView>
      )}
    </Screen>
  );
}
