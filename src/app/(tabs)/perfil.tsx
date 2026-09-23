import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { setLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { supabase } from '@/lib/supabase';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  es: '🇪🇸 Español',
  en: '🇬🇧 English',
  fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch',
};

export default function Perfil() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { profile, isSuperAdmin, isEmpleado, isOwner, isAdmin, signOut, refreshProfile } = useAuth();

  const [tieneVivienda, setTieneVivienda] = useState(true);
  const [esPresidente, setEsPresidente] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkOk, setLinkOk] = useState(false);
  const [linking, setLinking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      if (isOwner) {
        supabase
          .from('viviendas')
          .select('id')
          .eq('propietario_id', profile.id)
          .maybeSingle()
          .then(({ data }) => setTieneVivienda(!!data));
        supabase
          .from('viviendas')
          .select('id')
          .eq('propietario_id', profile.id)
          .eq('cargo', 'presidente')
          .maybeSingle()
          .then(({ data }) => setEsPresidente(!!data));
      }
    }, [isOwner, profile])
  );

  const roleLabel = isSuperAdmin
    ? t('profile.roleSuperAdmin')
    : isEmpleado
      ? t('profile.roleEmployee')
      : t('profile.roleOwner');

  const vincularCodigo = async () => {
    if (!codigo.trim()) return;
    setLinking(true);
    setLinkError(null);
    setLinkOk(false);
    const { error } = await supabase.rpc('redimir_codigo_acceso', { codigo_input: codigo.trim() });
    setLinking(false);
    if (error) {
      setLinkError(t('registro.invalidCode'));
      return;
    }
    setLinkOk(true);
    setCodigo('');
    setTieneVivienda(true);
    await refreshProfile();
  };

  return (
    <Screen>
      <AppText variant="title">{t('profile.title')}</AppText>

      <Card>
        <AppText variant="subtitle">
          {profile?.nombre} {profile?.apellidos}
        </AppText>
        <AppText secondary>{profile?.email}</AppText>
        <View style={{ marginTop: Spacing.xs }}>
          <Badge label={roleLabel} tone={isSuperAdmin ? 'primary' : isEmpleado ? 'success' : 'neutral'} />
        </View>
      </Card>

      {isOwner && !tieneVivienda ? (
        <Card>
          <AppText variant="subtitle">{t('profile.linkCode')}</AppText>
          <TextField
            value={codigo}
            onChangeText={setCodigo}
            placeholder={t('profile.linkCodePlaceholder')}
            autoCapitalize="characters"
          />
          {linkError ? <AppText color={theme.danger}>{linkError}</AppText> : null}
          {linkOk ? <AppText color={theme.success}>{t('profile.linkCodeSuccess')}</AppText> : null}
          <Button label={t('profile.linkCodeSubmit')} onPress={vincularCodigo} loading={linking} variant="secondary" />
        </Card>
      ) : null}

      <Card>
        <AppText variant="subtitle">{t('profile.language')}</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.xs }}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Button
              key={lang}
              label={LANGUAGE_LABELS[lang]}
              variant={i18n.language === lang ? 'primary' : 'secondary'}
              onPress={() => setLanguage(lang)}
            />
          ))}
        </View>
      </Card>

      {isAdmin ? <Button label="Fichar mi jornada" variant="secondary" onPress={() => router.push('/fichaje')} /> : null}
      {isSuperAdmin || esPresidente ? (
        <Button label="Solicitudes de ausencia" variant="secondary" onPress={() => router.push('/solicitudes')} />
      ) : null}

      <Button label={t('profile.signOut')} variant="secondary" onPress={signOut} />
    </Screen>
  );
}
