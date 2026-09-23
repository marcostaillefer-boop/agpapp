import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useComunidades } from '@/hooks/use-comunidades';
import { useTheme } from '@/hooks/use-theme';
import { generarCodigo } from '@/lib/codes';
import { supabase } from '@/lib/supabase';
import type { Empleado, Modulo, NivelPermiso, Profile } from '@/types/database';

const MODULOS: Modulo[] = ['comunidades', 'incidencias', 'cuotas', 'documentos', 'juntas', 'mantenimiento'];
const MODULO_LABEL: Record<Modulo, string> = {
  comunidades: 'Comunidades',
  incidencias: 'Incidencias',
  cuotas: 'Cuotas',
  documentos: 'Documentos',
  juntas: 'Juntas',
  mantenimiento: 'Mantenimiento',
};
const SIGUIENTE_NIVEL: Record<NivelPermiso, NivelPermiso> = {
  ninguno: 'ver',
  ver: 'editar',
  editar: 'ninguno',
};
const NIVEL_LABEL: Record<NivelPermiso, string> = { ninguno: 'Sin acceso', ver: 'Ver', editar: 'Editar' };

function PermisoChip({
  nivel,
  onPress,
}: {
  nivel: NivelPermiso;
  onPress: () => void;
}) {
  const theme = useTheme();
  const backgrounds: Record<NivelPermiso, string> = {
    ninguno: theme.border,
    ver: theme.primary + '33',
    editar: theme.success + '33',
  };
  const textColors: Record<NivelPermiso, string> = {
    ninguno: theme.textSecondary,
    ver: theme.primary,
    editar: theme.success,
  };
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        backgroundColor: backgrounds[nivel],
      }}
    >
      <AppText variant="caption" color={textColors[nivel]}>
        {NIVEL_LABEL[nivel]}
      </AppText>
    </Pressable>
  );
}

export default function Equipo() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isSuperAdmin, administracionId, profile } = useAuth();
  const { comunidades } = useComunidades();
  const [empleados, setEmpleados] = useState<(Empleado & { perfil: Profile | null })[]>([]);
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [comunidadEmpleado, setComunidadEmpleado] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!administracionId) return;
    const { data } = await supabase.from('empleados').select('*').eq('administracion_id', administracionId);
    const lista = (data as Empleado[] | null) ?? [];
    const perfiles = await Promise.all(
      lista.map((e) => supabase.from('profiles').select('*').eq('id', e.profile_id).maybeSingle())
    );
    setEmpleados(lista.map((e, i) => ({ ...e, perfil: (perfiles[i].data as Profile | null) ?? null })));
  }, [administracionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isSuperAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  const cambiarPermiso = async (empleado: Empleado, modulo: Modulo) => {
    const actual = empleado.permisos[modulo] ?? 'ninguno';
    const permisos = { ...empleado.permisos, [modulo]: SIGUIENTE_NIVEL[actual] };
    await supabase.from('empleados').update({ permisos }).eq('id', empleado.id);
    await load();
  };

  const generarCodigoEmpleado = async () => {
    if (!administracionId || !profile) return;
    setGenerando(true);
    const codigo = generarCodigo();
    const permisosIniciales: Record<Modulo, NivelPermiso> = {
      comunidades: 'ver',
      incidencias: 'ver',
      cuotas: 'ver',
      documentos: 'ver',
      juntas: 'ver',
      mantenimiento: 'ninguno',
    };
    const { error } = await supabase.from('codigos_acceso').insert({
      codigo,
      administracion_id: administracionId,
      comunidad_empleado_id: comunidadEmpleado,
      permisos: permisosIniciales,
      creado_por: profile.id,
    });
    setGenerando(false);
    if (!error) {
      setCodigoGenerado(codigo);
    }
  };

  return (
    <Screen>
      <AppText variant="title">{t('team.title')}</AppText>

      <Card>
        <AppText variant="subtitle">{t('team.newAccessCode')}</AppText>
        <AppText secondary variant="caption">
          Deja &quot;Despacho&quot; si trabaja en varias comunidades, o elige una si es personal fijo de esa comunidad
          (conserje, jardinero...): sus solicitudes de ausencia necesitarán también el visto bueno del presidente.
        </AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => setComunidadEmpleado(null)}
            style={{
              paddingHorizontal: Spacing.sm,
              paddingVertical: 6,
              borderRadius: Radius.pill,
              backgroundColor: comunidadEmpleado === null ? theme.primary : theme.surface,
              borderWidth: 1,
              borderColor: comunidadEmpleado === null ? theme.primary : theme.border,
            }}
          >
            <AppText variant="caption" color={comunidadEmpleado === null ? theme.primaryText : theme.text}>
              Despacho
            </AppText>
          </Pressable>
          {comunidades.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setComunidadEmpleado(c.id)}
              style={{
                paddingHorizontal: Spacing.sm,
                paddingVertical: 6,
                borderRadius: Radius.pill,
                backgroundColor: comunidadEmpleado === c.id ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: comunidadEmpleado === c.id ? theme.primary : theme.border,
              }}
            >
              <AppText variant="caption" color={comunidadEmpleado === c.id ? theme.primaryText : theme.text}>
                {c.nombre}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Button label={t('team.newAccessCode')} onPress={generarCodigoEmpleado} loading={generando} variant="secondary" />
        {codigoGenerado ? (
          <View style={{ gap: Spacing.xs, marginTop: Spacing.xs }}>
            <AppText variant="title">{codigoGenerado}</AppText>
            <Button
              label="Compartir código"
              variant="secondary"
              onPress={() => Share.share({ message: `Tu código de acceso a AGP Fincas: ${codigoGenerado}` })}
            />
          </View>
        ) : null}
      </Card>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="subtitle">{t('team.employees')}</AppText>
        {empleados.length === 0 ? (
          <EmptyState title="Todavía no hay empleados" />
        ) : (
          empleados.map((empleado) => (
            <Card key={empleado.id}>
              <AppText variant="subtitle">
                {empleado.perfil?.nombre} {empleado.perfil?.apellidos}
              </AppText>
              <AppText secondary>{empleado.perfil?.email}</AppText>
              <AppText secondary variant="caption">
                {empleado.comunidad_id
                  ? comunidades.find((c) => c.id === empleado.comunidad_id)?.nombre ?? 'Comunidad concreta'
                  : 'Personal del despacho'}
              </AppText>
              <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.xs }}>
                {MODULOS.map((modulo) => (
                  <View key={modulo} style={{ alignItems: 'center', gap: 2 }}>
                    <AppText variant="label" secondary>
                      {MODULO_LABEL[modulo]}
                    </AppText>
                    <PermisoChip
                      nivel={empleado.permisos[modulo] ?? 'ninguno'}
                      onPress={() => cambiarPermiso(empleado, modulo)}
                    />
                  </View>
                ))}
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
