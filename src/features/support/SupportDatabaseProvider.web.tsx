import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { createIndexedDbSupportRepository } from '../../db/indexedDbRepository';
import type { SupportRepository } from '../../db/repository';

const SupportRepositoryContext = createContext<SupportRepository | null>(null);

export function SupportDatabaseProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createIndexedDbSupportRepository(), []);
  return (
    <SupportRepositoryContext.Provider value={repository}>
      {children}
    </SupportRepositoryContext.Provider>
  );
}

export function useSupportRepository() {
  const repository = useContext(SupportRepositoryContext);
  if (!repository) {
    return {
      repository: null,
      unavailableView: (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>PC分析DBを準備しています</Text>
          <Text style={{ marginTop: 8, color: '#64748b' }}>
            ブラウザのIndexedDBを開いています。
          </Text>
        </View>
      ),
    };
  }
  return { repository, unavailableView: null };
}
