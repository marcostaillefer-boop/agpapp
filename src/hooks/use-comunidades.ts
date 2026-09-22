import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { supabase } from '@/lib/supabase';
import type { Comunidad } from '@/types/database';

export function useComunidades() {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('comunidades').select('*').order('nombre');
    setComunidades((data as Comunidad[] | null) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { comunidades, loading, reload: load };
}
