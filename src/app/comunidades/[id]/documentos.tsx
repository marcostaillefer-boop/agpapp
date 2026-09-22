import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import type { Documento } from '@/types/database';

const tipoLabel: Record<Documento['tipo'], string> = {
  acta: 'Acta',
  convocatoria: 'Convocatoria',
  presupuesto: 'Presupuesto',
  factura: 'Factura',
  otro: 'Otro',
};

export default function DocumentosComunidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, profile } = useAuth();
  const puedeEditar = can('documentos', 'editar');
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [nombreEnlace, setNombreEnlace] = useState('');
  const [enlace, setEnlace] = useState('');
  const [guardandoEnlace, setGuardandoEnlace] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('comunidad_id', id)
      .order('created_at', { ascending: false });
    setDocumentos((data as Documento[] | null) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const subirDocumento = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0] || !profile) return;

    const file = result.assets[0];
    setSubiendo(true);
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const path = `${id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, blob, { contentType: file.mimeType ?? 'application/octet-stream' });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('documentos').getPublicUrl(path);

      await supabase.from('documentos').insert({
        comunidad_id: id,
        nombre: file.name,
        tipo: 'otro',
        url: publicUrl.publicUrl,
        subido_por: profile.id,
      });

      await load();
    } finally {
      setSubiendo(false);
    }
  };

  const anadirEnlace = async () => {
    if (!nombreEnlace.trim() || !enlace.trim() || !profile) return;
    setGuardandoEnlace(true);
    await supabase.from('documentos').insert({
      comunidad_id: id,
      nombre: nombreEnlace.trim(),
      tipo: 'otro',
      url: enlace.trim(),
      subido_por: profile.id,
    });
    setNombreEnlace('');
    setEnlace('');
    setGuardandoEnlace(false);
    await load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Documentos' }} />

      {puedeEditar ? (
        <Card>
          <AppText variant="subtitle">Subir un archivo</AppText>
          <Button label="Elegir archivo" onPress={subirDocumento} loading={subiendo} variant="secondary" />

          <AppText variant="subtitle" style={{ marginTop: Spacing.sm }}>
            O enlazar un documento externo (SharePoint, Drive...)
          </AppText>
          <TextField label="Nombre" value={nombreEnlace} onChangeText={setNombreEnlace} placeholder="Acta 2026" />
          <TextField
            label="Enlace"
            value={enlace}
            onChangeText={setEnlace}
            placeholder="https://..."
            autoCapitalize="none"
          />
          <Button label="Añadir enlace" onPress={anadirEnlace} loading={guardandoEnlace} variant="secondary" />
        </Card>
      ) : null}

      {documentos.length === 0 ? (
        <EmptyState title="Sin documentos todavía" />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {documentos.map((doc) => (
            <Card key={doc.id} onPress={() => WebBrowser.openBrowserAsync(doc.url)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{doc.nombre}</AppText>
                <Badge label={tipoLabel[doc.tipo]} tone="primary" />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
