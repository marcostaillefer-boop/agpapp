import { useCallback, useState } from 'react';
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
import type {
  Empleado,
  FrecuenciaTarea,
  Profile,
  Proveedor,
  RegistroTarea,
  TareaMantenimiento,
  TipoEjecutor,
} from '@/types/database';

const FRECUENCIAS: { value: FrecuenciaTarea; label: string }[] = [
  { value: 'puntual', label: 'Puntual' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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

export default function MantenimientoComunidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { can, profile, administracionId } = useAuth();
  const puedeEditar = can('mantenimiento', 'editar');

  const [tareas, setTareas] = useState<TareaMantenimiento[]>([]);
  const [registros, setRegistros] = useState<RegistroTarea[]>([]);
  const [empleados, setEmpleados] = useState<(Empleado & { perfil: Profile | null })[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoEjecutor, setTipoEjecutor] = useState<TipoEjecutor>('personal');
  const [asignadoA, setAsignadoA] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState<string | null>(null);
  const [frecuencia, setFrecuencia] = useState<FrecuenciaTarea>('mensual');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: tareasData } = await supabase
      .from('tareas_mantenimiento')
      .select('*')
      .eq('comunidad_id', id)
      .eq('activa', true)
      .order('created_at', { ascending: false });
    const listaTareas = (tareasData as TareaMantenimiento[] | null) ?? [];
    setTareas(listaTareas);

    if (listaTareas.length > 0) {
      const { data: registrosData } = await supabase
        .from('tareas_mantenimiento_registros')
        .select('*')
        .in('tarea_id', listaTareas.map((t) => t.id))
        .order('fecha_prevista', { ascending: false });
      setRegistros((registrosData as RegistroTarea[] | null) ?? []);
    } else {
      setRegistros([]);
    }

    if (administracionId) {
      const [empleadosRes, proveedoresRes] = await Promise.all([
        supabase.from('empleados').select('*').eq('administracion_id', administracionId).eq('activo', true),
        supabase.from('proveedores').select('*').eq('administracion_id', administracionId).order('categoria'),
      ]);
      const listaEmpleados = (empleadosRes.data as Empleado[] | null) ?? [];
      const perfiles = await Promise.all(
        listaEmpleados.map((e) => supabase.from('profiles').select('*').eq('id', e.profile_id).maybeSingle())
      );
      setEmpleados(
        listaEmpleados.map((e, i) => ({ ...e, perfil: (perfiles[i].data as Profile | null) ?? null }))
      );
      setProveedores((proveedoresRes.data as Proveedor[] | null) ?? []);
    }
  }, [id, administracionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const marcarRealizada = async (tarea: TareaMantenimiento) => {
    if (!profile) return;
    setMarcando(tarea.id);
    const hoy = new Date().toISOString().slice(0, 10);
    await supabase.from('tareas_mantenimiento_registros').insert({
      tarea_id: tarea.id,
      fecha_prevista: hoy,
      fecha_completada: hoy,
      estado: 'completada',
      completado_por: profile.id,
    });
    setMarcando(null);
    await load();
  };

  const crearTarea = async () => {
    if (!titulo.trim() || !categoria.trim() || !profile) {
      setError('Rellena al menos el título y la categoría.');
      return;
    }
    if (tipoEjecutor === 'personal' && !asignadoA) {
      setError('Elige a qué empleado se asigna.');
      return;
    }
    if (tipoEjecutor === 'externa' && !proveedorId) {
      setError('Elige qué proveedor la realiza.');
      return;
    }
    setError(null);
    setGuardando(true);
    await supabase.from('tareas_mantenimiento').insert({
      comunidad_id: id,
      titulo: titulo.trim(),
      categoria: categoria.trim(),
      tipo_ejecutor: tipoEjecutor,
      asignado_a: tipoEjecutor === 'personal' ? asignadoA : null,
      proveedor_id: tipoEjecutor === 'externa' ? proveedorId : null,
      frecuencia,
      creado_por: profile.id,
    });
    setGuardando(false);
    setMostrarFormulario(false);
    setTitulo('');
    setCategoria('');
    setAsignadoA(null);
    setProveedorId(null);
    await load();
  };

  const ultimoRegistro = (tareaId: string) => registros.find((r) => r.tarea_id === tareaId);

  const renderTarea = (tarea: TareaMantenimiento) => {
    const ultimo = ultimoRegistro(tarea.id);
    const empleado = empleados.find((e) => e.profile_id === tarea.asignado_a);
    const proveedor = proveedores.find((p) => p.id === tarea.proveedor_id);
    return (
      <Card key={tarea.id}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="subtitle">{tarea.titulo}</AppText>
          <Badge label={FRECUENCIAS.find((f) => f.value === tarea.frecuencia)?.label ?? ''} tone="primary" />
        </View>
        <AppText secondary variant="caption">
          {tarea.categoria}
        </AppText>
        <AppText secondary variant="caption">
          {tarea.tipo_ejecutor === 'personal'
            ? `Personal: ${empleado?.perfil?.nombre ?? 'sin asignar'}`
            : `Empresa: ${proveedor?.nombre ?? 'sin asignar'}`}
        </AppText>
        {ultimo ? (
          <AppText variant="caption" secondary>
            Última vez realizada: {ultimo.fecha_completada ?? ultimo.fecha_prevista}
          </AppText>
        ) : (
          <AppText variant="caption" secondary>
            Todavía no se ha registrado ninguna vez
          </AppText>
        )}
        {puedeEditar ? (
          <Button
            label="Marcar como realizada hoy"
            variant="secondary"
            onPress={() => marcarRealizada(tarea)}
            loading={marcando === tarea.id}
          />
        ) : null}
      </Card>
    );
  };

  const tareasPersonal = tareas.filter((t) => t.tipo_ejecutor === 'personal');
  const tareasExternas = tareas.filter((t) => t.tipo_ejecutor === 'externa');

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Mantenimiento' }} />

      {puedeEditar && !mostrarFormulario ? (
        <Button label="Nueva tarea de mantenimiento" onPress={() => setMostrarFormulario(true)} />
      ) : null}

      {mostrarFormulario ? (
        <Card>
          <AppText variant="subtitle">Nueva tarea</AppText>
          <TextField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Poda de setos" />
          <TextField label="Categoría" value={categoria} onChangeText={setCategoria} placeholder="Jardinería" />

          <AppText variant="caption" secondary>
            ¿Quién la realiza?
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
            <Chip label="Personal propio" selected={tipoEjecutor === 'personal'} onPress={() => setTipoEjecutor('personal')} />
            <Chip label="Empresa externa" selected={tipoEjecutor === 'externa'} onPress={() => setTipoEjecutor('externa')} />
          </View>

          {tipoEjecutor === 'personal' ? (
            empleados.length === 0 ? (
              <AppText variant="caption" secondary>
                Todavía no hay empleados en el despacho. Invita alguno desde la pestaña Equipo.
              </AppText>
            ) : (
              <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
                {empleados.map((empleado) => (
                  <Chip
                    key={empleado.id}
                    label={empleado.perfil?.nombre ?? empleado.perfil?.email ?? 'Empleado'}
                    selected={asignadoA === empleado.profile_id}
                    onPress={() => setAsignadoA(empleado.profile_id)}
                  />
                ))}
              </View>
            )
          ) : proveedores.length === 0 ? (
            <AppText variant="caption" secondary>
              Todavía no hay proveedores en el directorio.
            </AppText>
          ) : (
            <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
              {proveedores.map((proveedor) => (
                <Chip
                  key={proveedor.id}
                  label={`${proveedor.nombre} (${proveedor.categoria})`}
                  selected={proveedorId === proveedor.id}
                  onPress={() => setProveedorId(proveedor.id)}
                />
              ))}
            </View>
          )}

          <AppText variant="caption" secondary>
            Frecuencia
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
            {FRECUENCIAS.map((f) => (
              <Chip key={f.value} label={f.label} selected={frecuencia === f.value} onPress={() => setFrecuencia(f.value)} />
            ))}
          </View>

          {error ? <AppText color={theme.danger}>{error}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Crear tarea" onPress={crearTarea} loading={guardando} style={{ flex: 1 }} />
            <Button label="Cancelar" variant="secondary" onPress={() => setMostrarFormulario(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Personal propio</AppText>
        {tareasPersonal.length === 0 ? (
          <EmptyState title="Sin tareas de personal propio" />
        ) : (
          tareasPersonal.map(renderTarea)
        )}
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">Empresas externas</AppText>
        {tareasExternas.length === 0 ? (
          <EmptyState title="Sin tareas asignadas a empresas externas" />
        ) : (
          tareasExternas.map(renderTarea)
        )}
      </View>
    </Screen>
  );
}
