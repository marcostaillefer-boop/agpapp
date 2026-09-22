import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Share, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { generarCodigo } from '@/lib/codes';
import { supabase } from '@/lib/supabase';
import type { Comunidad, Vivienda } from '@/types/database';

export default function ComunidadDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, can, profile } = useAuth();
  const puedeEditar = can('comunidades', 'editar');
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [nuevoIdentificador, setNuevoIdentificador] = useState('');
  const [nuevoCoeficiente, setNuevoCoeficiente] = useState('');
  const [creandoVivienda, setCreandoVivienda] = useState(false);
  const [codigoPorVivienda, setCodigoPorVivienda] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [comunidadRes, viviendasRes] = await Promise.all([
      supabase.from('comunidades').select('*').eq('id', id).single(),
      supabase.from('viviendas').select('*').eq('comunidad_id', id).order('identificador'),
    ]);
    setComunidad((comunidadRes.data as Comunidad | null) ?? null);
    setViviendas((viviendasRes.data as Vivienda[] | null) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const anadirVivienda = async () => {
    if (!nuevoIdentificador.trim()) return;
    setCreandoVivienda(true);
    await supabase.from('viviendas').insert({
      comunidad_id: id,
      identificador: nuevoIdentificador.trim(),
      coeficiente: Number(nuevoCoeficiente.replace(',', '.')) || 0,
    });
    setNuevoIdentificador('');
    setNuevoCoeficiente('');
    setCreandoVivienda(false);
    await load();
  };

  const generarCodigoPropietario = async (vivienda: Vivienda) => {
    if (!profile) return;
    const codigo = generarCodigo();
    const { error } = await supabase.from('codigos_acceso').insert({
      codigo,
      vivienda_id: vivienda.id,
      creado_por: profile.id,
    });
    if (!error) {
      setCodigoPorVivienda((prev) => ({ ...prev, [vivienda.id]: codigo }));
    }
  };

  if (!comunidad) {
    return (
      <Screen>
        <EmptyState title="Cargando comunidad..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: comunidad.nombre }} />

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="title">{comunidad.nombre}</AppText>
        <AppText secondary>{comunidad.direccion}</AppText>
        {comunidad.cif ? <AppText secondary>CIF: {comunidad.cif}</AppText> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
        <Card style={{ flexGrow: 1 }} onPress={() => router.push(`/comunidades/${id}/cuotas`)}>
          <AppText variant="subtitle">Cuotas</AppText>
          <AppText secondary>Ver estado de pagos</AppText>
        </Card>
        <Card style={{ flexGrow: 1 }} onPress={() => router.push(`/comunidades/${id}/documentos`)}>
          <AppText variant="subtitle">Documentos</AppText>
          <AppText secondary>Actas y convocatorias</AppText>
        </Card>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">
          {isAdmin ? 'Viviendas y propietarios' : 'Viviendas de la comunidad'}
        </AppText>
        {viviendas.length === 0 ? (
          <EmptyState title="Todavía no hay viviendas registradas" />
        ) : (
          viviendas.map((vivienda) => {
            const codigoGenerado = codigoPorVivienda[vivienda.id];
            return (
              <Card key={vivienda.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="subtitle">{vivienda.identificador}</AppText>
                  <AppText secondary>{vivienda.coeficiente}%</AppText>
                </View>
                {!vivienda.derecho_voto ? (
                  <AppText variant="caption" secondary>
                    Sin derecho a voto
                  </AppText>
                ) : null}

                {puedeEditar && !vivienda.propietario_id ? (
                  codigoGenerado ? (
                    <View style={{ gap: Spacing.xs }}>
                      <AppText variant="subtitle">{codigoGenerado}</AppText>
                      <Button
                        label="Compartir código"
                        variant="secondary"
                        onPress={() =>
                          Share.share({ message: `Tu código de acceso a AGP Fincas: ${codigoGenerado}` })
                        }
                      />
                    </View>
                  ) : (
                    <Button
                      label="Generar código para el propietario"
                      variant="secondary"
                      onPress={() => generarCodigoPropietario(vivienda)}
                    />
                  )
                ) : vivienda.propietario_id ? (
                  <Badge label="Propietario vinculado" tone="success" />
                ) : null}
              </Card>
            );
          })
        )}

        {puedeEditar ? (
          <Card>
            <AppText variant="subtitle">Añadir vivienda</AppText>
            <TextField
              label="Identificador"
              value={nuevoIdentificador}
              onChangeText={setNuevoIdentificador}
              placeholder="Portal A - 3ºB"
            />
            <TextField
              label="Coeficiente de participación (%)"
              value={nuevoCoeficiente}
              onChangeText={setNuevoCoeficiente}
              placeholder="2.5"
              keyboardType="decimal-pad"
            />
            <Button label="Añadir" onPress={anadirVivienda} loading={creandoVivienda} variant="secondary" />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
