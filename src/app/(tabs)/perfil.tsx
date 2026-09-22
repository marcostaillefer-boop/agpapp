import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function Perfil() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <Screen>
      <AppText variant="title">Perfil</AppText>

      <Card>
        <AppText variant="subtitle">
          {profile?.nombre} {profile?.apellidos}
        </AppText>
        <AppText secondary>{profile?.email}</AppText>
        <View style={{ marginTop: Spacing.xs }}>
          <Badge label={isAdmin ? 'Administrador' : 'Propietario'} tone={isAdmin ? 'primary' : 'neutral'} />
        </View>
      </Card>

      <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
