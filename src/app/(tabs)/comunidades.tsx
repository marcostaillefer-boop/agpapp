import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useComunidades } from '@/hooks/use-comunidades';

export default function Comunidades() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { comunidades, loading } = useComunidades();

  return (
    <Screen>
      <AppText variant="title">Comunidades</AppText>

      {isAdmin ? (
        <Card onPress={() => router.push('/proveedores')}>
          <AppText variant="subtitle">Proveedores</AppText>
          <AppText secondary>Directorio de empresas habituales del despacho</AppText>
        </Card>
      ) : null}

      {!loading && comunidades.length === 0 ? (
        <EmptyState
          title="Todavía no hay comunidades"
          description="Cuando se cree una comunidad aparecerá aquí."
        />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {comunidades.map((comunidad) => (
            <Card key={comunidad.id} onPress={() => router.push(`/comunidades/${comunidad.id}`)}>
              <AppText variant="subtitle">{comunidad.nombre}</AppText>
              <AppText secondary>{comunidad.direccion}</AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
