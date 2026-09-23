import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Share, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { generarCodigo } from '@/lib/codes';
import { supabase } from '@/lib/supabase';
import type { CargoDirectivo, Comunidad, Vivienda } from '@/types/database';

const CARGOS: { value: CargoDirectivo; label: string }[] = [
  { value: 'presidente', label: 'Presidente' },
  { value: 'vicepresidente', label: 'Vicepresidente' },
  { value: 'secretario', label: 'Secretario' },
  { value: 'vocal', label: 'Vocal' },
];

type BorradorContacto = {
  nombre_propietario: string;
  telefono: string;
  email: string;
  direccion_notificacion: string;
  bloque: string;
};

const borradorVacio: BorradorContacto = {
  nombre_propietario: '',
  telefono: '',
  email: '',
  direccion_notificacion: '',
  bloque: '',
};

export default function ComunidadDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, can, profile } = useAuth();
  const theme = useTheme();
  const puedeEditar = can('comunidades', 'editar');
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [nuevoIdentificador, setNuevoIdentificador] = useState('');
  const [nuevoBloque, setNuevoBloque] = useState('');
  const [nuevoCoeficiente, setNuevoCoeficiente] = useState('');
  const [creandoVivienda, setCreandoVivienda] = useState(false);
  const [codigoPorVivienda, setCodigoPorVivienda] = useState<Record<string, string>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<BorradorContacto>(borradorVacio);
  const [guardandoContacto, setGuardandoContacto] = useState(false);

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
      bloque: nuevoBloque.trim() || null,
      coeficiente: Number(nuevoCoeficiente.replace(',', '.')) || 0,
    });
    setNuevoIdentificador('');
    setNuevoBloque('');
    setNuevoCoeficiente('');
    setCreandoVivienda(false);
    await load();
  };

  const cambiarCargo = async (vivienda: Vivienda, cargo: CargoDirectivo) => {
    const nuevoCargo = vivienda.cargo === cargo ? null : cargo;
    await supabase.from('viviendas').update({ cargo: nuevoCargo }).eq('id', vivienda.id);
    await load();
  };

  const abrirEdicionContacto = (vivienda: Vivienda) => {
    setEditandoId(vivienda.id);
    setBorrador({
      nombre_propietario: vivienda.nombre_propietario ?? '',
      telefono: vivienda.telefono ?? '',
      email: vivienda.email ?? '',
      direccion_notificacion: vivienda.direccion_notificacion ?? '',
      bloque: vivienda.bloque ?? '',
    });
  };

  const guardarContacto = async (vivienda: Vivienda) => {
    setGuardandoContacto(true);
    await supabase
      .from('viviendas')
      .update({
        nombre_propietario: borrador.nombre_propietario.trim() || null,
        telefono: borrador.telefono.trim() || null,
        email: borrador.email.trim() || null,
        direccion_notificacion: borrador.direccion_notificacion.trim() || null,
        bloque: borrador.bloque.trim() || null,
      })
      .eq('id', vivienda.id);
    setGuardandoContacto(false);
    setEditandoId(null);
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
        <Card style={{ flexGrow: 1 }} onPress={() => router.push(`/comunidades/${id}/circulares`)}>
          <AppText variant="subtitle">Circulares</AppText>
          <AppText secondary>Avisos a propietarios</AppText>
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
            const editando = editandoId === vivienda.id;
            const direccionEfectiva = vivienda.direccion_notificacion || comunidad.direccion;
            return (
              <Card key={vivienda.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="subtitle">
                    {vivienda.identificador}
                    {vivienda.bloque ? ` · ${vivienda.bloque}` : ''}
                  </AppText>
                  <AppText secondary>{vivienda.coeficiente}%</AppText>
                </View>
                {!vivienda.derecho_voto ? (
                  <AppText variant="caption" secondary>
                    Sin derecho a voto
                  </AppText>
                ) : null}
                {vivienda.cargo ? (
                  <Badge label={CARGOS.find((c) => c.value === vivienda.cargo)?.label ?? ''} tone="primary" />
                ) : null}

                {puedeEditar ? (
                  <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.xs }}>
                    {CARGOS.map((cargo) => {
                      const activo = vivienda.cargo === cargo.value;
                      return (
                        <Pressable key={cargo.value} onPress={() => cambiarCargo(vivienda, cargo.value)}>
                          <AppText
                            variant="caption"
                            color={activo ? theme.primary : theme.textSecondary}
                            style={{ fontWeight: activo ? '700' : '400' }}
                          >
                            {cargo.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {editando ? (
                  <View style={{ gap: Spacing.xs, marginTop: Spacing.xs }}>
                    <TextField
                      label="Nombre del propietario"
                      value={borrador.nombre_propietario}
                      onChangeText={(v) => setBorrador((b) => ({ ...b, nombre_propietario: v }))}
                    />
                    <TextField
                      label="Teléfono"
                      value={borrador.telefono}
                      onChangeText={(v) => setBorrador((b) => ({ ...b, telefono: v }))}
                      keyboardType="phone-pad"
                    />
                    <TextField
                      label="Email"
                      value={borrador.email}
                      onChangeText={(v) => setBorrador((b) => ({ ...b, email: v }))}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <TextField
                      label="Dirección de notificación (si es distinta de la comunidad)"
                      value={borrador.direccion_notificacion}
                      onChangeText={(v) => setBorrador((b) => ({ ...b, direccion_notificacion: v }))}
                    />
                    <TextField
                      label="Bloque / portal"
                      value={borrador.bloque}
                      onChangeText={(v) => setBorrador((b) => ({ ...b, bloque: v }))}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <Button
                        label="Guardar"
                        onPress={() => guardarContacto(vivienda)}
                        loading={guardandoContacto}
                        style={{ flex: 1 }}
                      />
                      <Button
                        label="Cancelar"
                        variant="secondary"
                        onPress={() => setEditandoId(null)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 2, marginTop: Spacing.xs }}>
                    {vivienda.nombre_propietario ? (
                      <AppText variant="caption">{vivienda.nombre_propietario}</AppText>
                    ) : null}
                    {vivienda.telefono ? <AppText variant="caption" secondary>{vivienda.telefono}</AppText> : null}
                    {vivienda.email ? <AppText variant="caption" secondary>{vivienda.email}</AppText> : null}
                    <AppText variant="caption" secondary>
                      {direccionEfectiva}
                      {!vivienda.direccion_notificacion ? ' (la de la comunidad)' : ''}
                    </AppText>
                    {puedeEditar ? (
                      <Pressable onPress={() => abrirEdicionContacto(vivienda)}>
                        <AppText variant="caption" color={theme.primary}>
                          Editar datos de contacto
                        </AppText>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {puedeEditar && !vivienda.propietario_id ? (
                  codigoGenerado ? (
                    <View style={{ gap: Spacing.xs, marginTop: Spacing.xs }}>
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
                      style={{ marginTop: Spacing.xs }}
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
              placeholder="3ºB"
            />
            <TextField
              label="Bloque / portal (opcional)"
              value={nuevoBloque}
              onChangeText={setNuevoBloque}
              placeholder="Portal A"
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
