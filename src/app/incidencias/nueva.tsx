import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useComunidades } from '@/hooks/use-comunidades';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function NuevaIncidencia() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { comunidades } = useComunidades();
  const [comunidadId, setComunidadId] = useState<string | null>(comunidades[0]?.id ?? null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeComunidad = comunidadId ?? comunidades[0]?.id ?? null;

  const submit = async () => {
    if (!activeComunidad || !titulo.trim() || !descripcion.trim() || !profile) {
      setError('Rellena la comunidad, el título y la descripción.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: insertError } = await supabase.from('incidencias').insert({
      comunidad_id: activeComunidad,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      creado_por: profile.id,
      estado: 'abierta',
    });
    setLoading(false);
    if (insertError) {
      setError('No se ha podido crear la incidencia.');
      return;
    }
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}
    >
      <Stack.Screen options={{ headerShown: true, title: 'Nueva incidencia', presentation: 'modal' }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" secondary>
          Comunidad
        </AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
          {comunidades.map((c) => {
            const selected = activeComunidad === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setComunidadId(c.id)}
                style={{
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 6,
                  borderRadius: Radius.pill,
                  backgroundColor: selected ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: selected ? theme.primary : theme.border,
                }}
              >
                <AppText color={selected ? theme.primaryText : theme.text} variant="caption">
                  {c.nombre}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Ej. Avería ascensor" />
      <TextField
        label="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Describe la incidencia con el mayor detalle posible"
        multiline
        numberOfLines={4}
        style={{ minHeight: 100, textAlignVertical: 'top' }}
      />

      {error ? <AppText color={theme.danger}>{error}</AppText> : null}
      <Button label="Enviar incidencia" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
