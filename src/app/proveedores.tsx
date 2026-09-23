import { useCallback, useState } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
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
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Proveedor } from '@/types/database';

export default function Proveedores() {
  const theme = useTheme();
  const { can, profile, administracionId } = useAuth();
  const puedeEditar = can('comunidades', 'editar');

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!administracionId) return;
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .eq('administracion_id', administracionId)
      .order('categoria');
    setProveedores((data as Proveedor[] | null) ?? []);
  }, [administracionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const crearProveedor = async () => {
    if (!categoria.trim() || !nombre.trim() || !profile || !administracionId) {
      setError('Rellena al menos la categoría y el nombre.');
      return;
    }
    setError(null);
    setGuardando(true);
    await supabase.from('proveedores').insert({
      administracion_id: administracionId,
      categoria: categoria.trim(),
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      notas: notas.trim() || null,
      creado_por: profile.id,
    });
    setGuardando(false);
    setMostrarFormulario(false);
    setCategoria('');
    setNombre('');
    setTelefono('');
    setEmail('');
    setNotas('');
    await load();
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Proveedores' }} />
      <AppText secondary>
        Directorio propio de empresas habituales (fontanería, electricidad, ascensores...) para derivar incidencias
        y tareas de mantenimiento sin depender de un buscador externo.
      </AppText>

      {puedeEditar && !mostrarFormulario ? (
        <Button label="Nuevo proveedor" onPress={() => setMostrarFormulario(true)} />
      ) : null}

      {mostrarFormulario ? (
        <Card>
          <AppText variant="subtitle">Nuevo proveedor</AppText>
          <TextField label="Categoría" value={categoria} onChangeText={setCategoria} placeholder="Fontanería" />
          <TextField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Fontanería Pérez, S.L." />
          <TextField label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Notas" value={notas} onChangeText={setNotas} placeholder="Horario, tarifa, contacto habitual..." />

          {error ? <AppText color={theme.danger}>{error}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Guardar" onPress={crearProveedor} loading={guardando} style={{ flex: 1 }} />
            <Button label="Cancelar" variant="secondary" onPress={() => setMostrarFormulario(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      {proveedores.length === 0 ? (
        <EmptyState title="Todavía no hay proveedores en el directorio" />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {proveedores.map((proveedor) => (
            <Card key={proveedor.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">{proveedor.nombre}</AppText>
                <Badge label={proveedor.categoria} tone="primary" />
              </View>
              {proveedor.telefono ? <AppText secondary variant="caption">{proveedor.telefono}</AppText> : null}
              {proveedor.email ? <AppText secondary variant="caption">{proveedor.email}</AppText> : null}
              {proveedor.notas ? <AppText secondary variant="caption">{proveedor.notas}</AppText> : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
