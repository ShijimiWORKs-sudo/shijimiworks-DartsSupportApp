import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';

import {
  initializeSupportDatabase,
  SUPPORT_DATABASE_FILE_NAME,
  type SupportDatabase,
} from '../../db/database';
import { createMemorySupportRepository } from '../../db/memoryRepository';
import { createSupportRepository, type SupportRepository } from '../../db/repository';

const SupportRepositoryContext = createContext<SupportRepository | null>(null);

export function SupportDatabaseProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return <WebPreviewRepositoryProvider>{children}</WebPreviewRepositoryProvider>;
  }

  return (
    <SQLiteProvider
      databaseName={SUPPORT_DATABASE_FILE_NAME}
      onInit={initializeSupportDatabase}
      onError={(error) => {
        console.warn('DartsSupportApp database initialization failed', error);
      }}
    >
      <SupportRepositoryBridge>{children}</SupportRepositoryBridge>
    </SQLiteProvider>
  );
}

function WebPreviewRepositoryProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createMemorySupportRepository(), []);
  return (
    <SupportRepositoryContext.Provider value={repository}>
      {children}
    </SupportRepositoryContext.Provider>
  );
}

function SupportRepositoryBridge({ children }: { children: ReactNode }) {
  const db = useSQLiteContext() as SupportDatabase;
  const repository = useMemo(() => createSupportRepository(db), [db]);
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
          <Text style={{ fontSize: 18, fontWeight: '700' }}>DBを準備しています</Text>
          <Text style={{ marginTop: 8, color: '#64748b' }}>
            初期化が終わるまで少し待ってください。
          </Text>
        </View>
      ),
    };
  }
  return { repository, unavailableView: null };
}
