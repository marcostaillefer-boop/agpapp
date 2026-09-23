import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image, Pressable, ScrollView, View } from 'react-native';

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
  const [foto, setFoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionTexto, setUbicacionTexto] = useState('');
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeComunidad = comunidadId ?? comunidades[0]?.id ?? null;

  const hacerFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) setFoto(result.assets[0]);
  };

  const elegirDeGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) setFoto(result.assets[0]);
  };

  const usarUbicacionActual = async () => {
    setBuscandoUbicacion(true);
    setAvisoUbicacion(null);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setAvisoUbicacion('No tenemos permiso de ubicación. Describe el lugar a mano abajo.');
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUbicacion({ lat: posicion.coords.latitude, lng: posicion.coords.longitude });
    } catch {
      setAvisoUbicacion('No hemos podido obtener tu ubicación exacta. Describe el lugar a mano abajo.');
    } finally {
      setBuscandoUbicacion(false);
    }
  };

  const submit = async () => {
    if (!activeComunidad || !titulo.trim() || !descripcion.trim() || !profile) {
      setError('Rellena la comunidad, el título y la descripción.');
      return;
    }
    setError(null);
    setLoading(true);

    let fotoUrl: string | null = null;
    if (foto) {
      const respuesta = await fetch(foto.uri);
      const blob = await respuesta.blob();
      const extension = foto.uri.split('.').pop() ?? 'jpg';
      const path = `${activeComunidad}/${Date.now()}-incidencia.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('incidencias')
        .upload(path, blob, { contentType: foto.mimeType ?? 'image/jpeg' });
      if (!uploadError) {
        fotoUrl = supabase.storage.from('incidencias').getPublicUrl(path).data.publicUrl;
      }
    }

    const { error: insertError } = await supabase.from('incidencias').insert({
      comunidad_id: activeComunidad,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      creado_por: profile.id,
      estado: 'abierta',
      foto_url: fotoUrl,
      latitud: ubicacion?.lat ?? null,
      longitud: ubicacion?.lng ?? null,
      ubicacion_texto: ubicacionTexto.trim() || null,
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

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" secondary>
          Foto (opcional)
        </AppText>
        {foto ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Image source={{ uri: foto.uri }} style={{ width: 84, height: 84, borderRadius: Radius.md }} />
            <Pressable onPress={() => setFoto(null)}>
              <AppText color={theme.danger} variant="caption">
                Quitar foto
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Hacer foto" variant="secondary" onPress={hacerFoto} style={{ flex: 1 }} />
            <Button label="Elegir de galería" variant="secondary" onPress={elegirDeGaleria} style={{ flex: 1 }} />
          </View>
        )}
      </View>

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" secondary>
          Ubicación
        </AppText>
        {ubicacion ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText secondary variant="caption">
              Ubicación capturada ({ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)})
            </AppText>
            <Pressable onPress={() => setUbicacion(null)}>
              <AppText color={theme.danger} variant="caption">
                Quitar
              </AppText>
            </Pressable>
          </View>
        ) : (
          <Button
            label="Usar mi ubicación actual"
            variant="secondary"
            onPress={usarUbicacionActual}
            loading={buscandoUbicacion}
          />
        )}
        {avisoUbicacion ? (
          <AppText variant="caption" color={theme.warning}>
            {avisoUbicacion}
          </AppText>
        ) : null}
        <TextField
          value={ubicacionTexto}
          onChangeText={setUbicacionTexto}
          placeholder="O describe el lugar a mano: portal, planta, zona..."
        />
      </View>

      {error ? <AppText color={theme.danger}>{error}</AppText> : null}
      <Button label="Enviar incidencia" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
