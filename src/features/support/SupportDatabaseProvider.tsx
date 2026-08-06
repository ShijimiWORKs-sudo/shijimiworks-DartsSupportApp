import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Text, View } from 'react-native';

import {
  initializeSupportDatabase,
  SUPPORT_DATABASE_FILE_NAME,
  type SupportDatabase,
} from '../../db/database';
import { createMemorySupportRepository } from '../../db/memoryRepository';
import { createSupportRepository, type SupportRepository } from '../../db/repository';
import { Button } from '../../../components/ui';
import { selectSupportRepositoryMode } from './repositoryMode';

const SupportRepositoryContext = createContext<SupportRepository | null>(null);

export function SupportDatabaseProvider({ children }: { children: ReactNode }) {
  const [initError, setInitError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const repositoryMode = selectSupportRepositoryMode(Platform.OS);
  const handleInit = useCallback(async (db: SupportDatabase) => {
    setInitError(null);
    await initializeSupportDatabase(db);
  }, []);

  const retry = useCallback(() => {
    setInitError(null);
    setRetryKey((current) => current + 1);
  }, []);

  if (repositoryMode === 'memory-web-preview') {
    return <WebPreviewRepositoryProvider>{children}</WebPreviewRepositoryProvider>;
  }

  if (initError) {
    return <DatabaseErrorView error={initError} onRetry={retry} />;
  }

  return (
    <Suspense fallback={<DatabaseLoadingView />}>
      <SQLiteProvider
        key={retryKey}
        databaseName={SUPPORT_DATABASE_FILE_NAME}
        onInit={handleInit}
        onError={(error) => {
          console.warn('DartsSupportApp database initialization failed', error);
          setInitError(error);
        }}
        useSuspense
      >
        <SupportRepositoryBridge>{children}</SupportRepositoryBridge>
      </SQLiteProvider>
    </Suspense>
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

function DatabaseLoadingView() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>DBを準備しています</Text>
      <Text style={{ marginTop: 8, color: '#64748b' }}>
        初回起動または更新後のmigrationを実行しています。
      </Text>
    </View>
  );
}

function DatabaseErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#991b1b' }}>
        DBを初期化できませんでした
      </Text>
      <Text style={{ marginTop: 8, color: '#64748b', lineHeight: 20 }}>
        アプリを閉じずに再試行できます。繰り返し失敗する場合は、PC側Metroのエラー内容も確認してください。
      </Text>
      <Text style={{ marginTop: 8, color: '#991b1b' }}>{error.message}</Text>
      <View style={{ marginTop: 12 }}>
        <Button label="再試行" onPress={onRetry} />
      </View>
    </View>
  );
}
