import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useComunidades } from '@/hooks/use-comunidades';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { ModalidadJunta, TipoJunta } from '@/types/database';

interface PuntoBorrador {
  titulo: string;
  descripcion: string;
  requiereVotacion: boolean;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: Radius.pill,
        backgroundColor: selected ? theme.primary : theme.surface,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
      }}
    >
      <AppText variant="caption" color={selected ? theme.primaryText : theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function NuevaJunta() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { comunidades } = useComunidades();

  const [comunidadId, setComunidadId] = useState<string | null>(comunidades[0]?.id ?? null);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoJunta>('ordinaria');
  const [modalidad, setModalidad] = useState<ModalidadJunta>('presencial');
  const [fecha, setFecha] = useState(new Date());
  const [hora, setHora] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [lugar, setLugar] = useState('');
  const [enlace, setEnlace] = useState('');
  const [puntos, setPuntos] = useState<PuntoBorrador[]>([
    { titulo: '', descripcion: '', requiereVotacion: true },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeComunidad = comunidadId ?? comunidades[0]?.id ?? null;

  const actualizarPunto = (index: number, patch: Partial<PuntoBorrador>) => {
    setPuntos((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const submit = async () => {
    const puntosValidos = puntos.filter((p) => p.titulo.trim().length > 0);
    if (!activeComunidad || !titulo.trim() || puntosValidos.length === 0 || !profile) {
      setError('Rellena la comunidad, el título de la junta y al menos un punto del orden del día.');
      return;
    }
    setError(null);
    setLoading(true);

    const { data: junta, error: juntaError } = await supabase
      .from('juntas')
      .insert({
        comunidad_id: activeComunidad,
        titulo: titulo.trim(),
        tipo,
        modalidad,
        fecha: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`,
        hora: `${pad(hora.getHours())}:${pad(hora.getMinutes())}`,
        lugar: lugar.trim() || null,
        enlace_online: enlace.trim() || null,
        estado: 'convocada',
        creado_por: profile.id,
      })
      .select()
      .single();

    if (juntaError || !junta) {
      setError('No se ha podido crear la junta.');
      setLoading(false);
      return;
    }

    const { error: puntosError } = await supabase.from('puntos_orden_dia').insert(
      puntosValidos.map((p, index) => ({
        junta_id: junta.id,
        orden: index + 1,
        titulo: p.titulo.trim(),
        descripcion: p.descripcion.trim() || null,
        requiere_votacion: p.requiereVotacion,
        estado: 'pendiente',
      }))
    );

    setLoading(false);
    if (puntosError) {
      setError('La junta se creó pero hubo un problema guardando el orden del día.');
      return;
    }
    router.replace(`/juntas/${junta.id}`);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}
    >
      <Stack.Screen options={{ headerShown: true, title: 'Convocar junta', presentation: 'modal' }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" secondary>
          Comunidad
        </AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
          {comunidades.map((c) => (
            <Chip key={c.id} label={c.nombre} selected={activeComunidad === c.id} onPress={() => setComunidadId(c.id)} />
          ))}
        </View>
      </View>

      <TextField label="Título de la junta" value={titulo} onChangeText={setTitulo} placeholder="Junta ordinaria anual 2026" />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" secondary>
          Tipo
        </AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          <Chip label="Ordinaria" selected={tipo === 'ordinaria'} onPress={() => setTipo('ordinaria')} />
          <Chip label="Extraordinaria" selected={tipo === 'extraordinaria'} onPress={() => setTipo('extraordinaria')} />
        </View>
      </View>

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" secondary>
          Modalidad
        </AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          <Chip label="Presencial" selected={modalidad === 'presencial'} onPress={() => setModalidad('presencial')} />
          <Chip label="Online" selected={modalidad === 'online'} onPress={() => setModalidad('online')} />
          <Chip label="Mixta" selected={modalidad === 'mixta'} onPress={() => setModalidad('mixta')} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <AppText variant="caption" secondary>
            Fecha
          </AppText>
          <Button
            label={fecha.toLocaleDateString('es-ES')}
            variant="secondary"
            onPress={() => setShowDatePicker(true)}
          />
        </View>
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <AppText variant="caption" secondary>
            Hora
          </AppText>
          <Button
            label={`${pad(hora.getHours())}:${pad(hora.getMinutes())}`}
            variant="secondary"
            onPress={() => setShowTimePicker(true)}
          />
        </View>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={fecha}
          mode="date"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setFecha(date);
          }}
        />
      ) : null}
      {showTimePicker ? (
        <DateTimePicker
          value={hora}
          mode="time"
          onChange={(_, date) => {
            setShowTimePicker(false);
            if (date) setHora(date);
          }}
        />
      ) : null}

      {modalidad !== 'online' ? (
        <TextField label="Lugar" value={lugar} onChangeText={setLugar} placeholder="Salón de actos, portal 1" />
      ) : null}
      {modalidad !== 'presencial' ? (
        <TextField
          label="Enlace de la videollamada"
          value={enlace}
          onChangeText={setEnlace}
          placeholder="https://meet.google.com/..."
          autoCapitalize="none"
        />
      ) : null}

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Orden del día</AppText>
        {puntos.map((punto, index) => (
          <View key={index} style={{ gap: Spacing.xs, borderTopWidth: index > 0 ? 1 : 0, borderColor: theme.border, paddingTop: index > 0 ? Spacing.sm : 0 }}>
            <TextField
              label={`Punto ${index + 1}`}
              value={punto.titulo}
              onChangeText={(text) => actualizarPunto(index, { titulo: text })}
              placeholder="Aprobación de presupuesto"
            />
            <TextField
              value={punto.descripcion}
              onChangeText={(text) => actualizarPunto(index, { descripcion: text })}
              placeholder="Breve explicación del punto (opcional)"
              multiline
              numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
              <Chip
                label="Requiere votación"
                selected={punto.requiereVotacion}
                onPress={() => actualizarPunto(index, { requiereVotacion: !punto.requiereVotacion })}
              />
              {puntos.length > 1 ? (
                <Pressable onPress={() => setPuntos((prev) => prev.filter((_, i) => i !== index))}>
                  <AppText color={theme.danger} variant="caption">
                    Eliminar punto
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        <Button
          label="Añadir punto"
          variant="secondary"
          onPress={() =>
            setPuntos((prev) => [...prev, { titulo: '', descripcion: '', requiereVotacion: true }])
          }
        />
      </View>

      {error ? <AppText color={theme.danger}>{error}</AppText> : null}
      <Button label="Convocar junta" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
