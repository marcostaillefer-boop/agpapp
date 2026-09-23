import { useCallback, useMemo, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

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
import type { Circular, TipoDestinatarios, Vivienda } from '@/types/database';

const DESTINATARIOS_LABEL: Record<TipoDestinatarios, string> = {
  todos: 'Toda la comunidad',
  bloque: 'Un bloque/portal',
  seleccion: 'Selección de viviendas',
};

export default function CircularesComunidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { can, profile } = useAuth();
  const puedeEditar = can('comunidades', 'editar');

  const [circulares, setCirculares] = useState<Circular[]>([]);
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [destinatarios, setDestinatarios] = useState<TipoDestinatarios>('todos');
  const [bloqueElegido, setBloqueElegido] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [circularesRes, viviendasRes] = await Promise.all([
      supabase.from('circulares').select('*').eq('comunidad_id', id).order('created_at', { ascending: false }),
      supabase.from('viviendas').select('*').eq('comunidad_id', id).order('identificador'),
    ]);
    setCirculares((circularesRes.data as Circular[] | null) ?? []);
    setViviendas((viviendasRes.data as Vivienda[] | null) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const bloques = useMemo(
    () => Array.from(new Set(viviendas.map((v) => v.bloque).filter((b): b is string => !!b))),
    [viviendas]
  );

  const toggleSeleccionada = (viviendaId: string) => {
    setSeleccionadas((prev) =>
      prev.includes(viviendaId) ? prev.filter((v) => v !== viviendaId) : [...prev, viviendaId]
    );
  };

  const enviarCircular = async () => {
    if (!titulo.trim() || !mensaje.trim() || !profile) {
      setError('Rellena el título y el mensaje.');
      return;
    }
    if (destinatarios === 'bloque' && !bloqueElegido) {
      setError('Elige a qué bloque va dirigida.');
      return;
    }
    if (destinatarios === 'seleccion' && seleccionadas.length === 0) {
      setError('Elige al menos una vivienda.');
      return;
    }
    setError(null);
    setEnviando(true);

    const { data: circular, error: insertError } = await supabase
      .from('circulares')
      .insert({
        comunidad_id: id,
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        destinatarios,
        bloque: destinatarios === 'bloque' ? bloqueElegido : null,
        creado_por: profile.id,
      })
      .select()
      .single();

    if (insertError || !circular) {
      setEnviando(false);
      setError('No se ha podido enviar la circular.');
      return;
    }

    if (destinatarios === 'seleccion') {
      await supabase
        .from('circulares_destinatarios')
        .insert(seleccionadas.map((viviendaId) => ({ circular_id: circular.id, vivienda_id: viviendaId })));
    }

    setEnviando(false);
    setMostrarFormulario(false);
    setTitulo('');
    setMensaje('');
    setDestinatarios('todos');
    setBloqueElegido(null);
    setSeleccionadas([]);
    await load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Circulares' }} />

      {puedeEditar && !mostrarFormulario ? (
        <Button label="Nueva circular" onPress={() => setMostrarFormulario(true)} />
      ) : null}

      {mostrarFormulario ? (
        <Card>
          <AppText variant="subtitle">Nueva circular</AppText>
          <TextField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Corte de agua programado" />
          <TextField
            label="Mensaje"
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <AppText variant="caption" secondary>
            Destinatarios
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
            {(Object.keys(DESTINATARIOS_LABEL) as TipoDestinatarios[]).map((opcion) => {
              const activo = destinatarios === opcion;
              return (
                <Pressable
                  key={opcion}
                  onPress={() => setDestinatarios(opcion)}
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
                    {DESTINATARIOS_LABEL[opcion]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {destinatarios === 'bloque' ? (
            bloques.length === 0 ? (
              <AppText variant="caption" secondary>
                Ninguna vivienda tiene bloque/portal asignado todavía.
              </AppText>
            ) : (
              <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
                {bloques.map((bloque) => {
                  const activo = bloqueElegido === bloque;
                  return (
                    <Pressable
                      key={bloque}
                      onPress={() => setBloqueElegido(bloque)}
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
                        {bloque}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            )
          ) : null}

          {destinatarios === 'seleccion' ? (
            <View style={{ gap: Spacing.xs }}>
              {viviendas.map((vivienda) => {
                const marcada = seleccionadas.includes(vivienda.id);
                return (
                  <Pressable
                    key={vivienda.id}
                    onPress={() => toggleSeleccionada(vivienda.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: marcada ? theme.primary : theme.border,
                        backgroundColor: marcada ? theme.primary : 'transparent',
                      }}
                    />
                    <AppText variant="caption">{vivienda.identificador}</AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {error ? <AppText color={theme.danger}>{error}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Enviar circular" onPress={enviarCircular} loading={enviando} style={{ flex: 1 }} />
            <Button label="Cancelar" variant="secondary" onPress={() => setMostrarFormulario(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      {circulares.length === 0 ? (
        <EmptyState title="Todavía no se ha enviado ninguna circular" />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {circulares.map((circular) => (
            <Card key={circular.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{circular.titulo}</AppText>
                <Badge label={DESTINATARIOS_LABEL[circular.destinatarios]} tone="primary" />
              </View>
              <AppText secondary>{circular.mensaje}</AppText>
              {circular.bloque ? (
                <AppText variant="caption" secondary>
                  Bloque: {circular.bloque}
                </AppText>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
