import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import {
  Component,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ErrorInfo,
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
  const [retryKey, setRetryKey] = useState(0);
  const repositoryMode = selectSupportRepositoryMode(Platform.OS);
  const handleInit = useCallback(async (db: SupportDatabase) => {
    await initializeSupportDatabase(db);
  }, []);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  if (repositoryMode === 'memory-web-preview') {
    return <WebPreviewRepositoryProvider>{children}</WebPreviewRepositoryProvider>;
  }

  return (
    <DatabaseErrorBoundary key={retryKey} onRetry={retry}>
      <Suspense fallback={<DatabaseLoadingView />}>
        <SQLiteProvider databaseName={SUPPORT_DATABASE_FILE_NAME} onInit={handleInit} useSuspense>
          <SupportRepositoryBridge>{children}</SupportRepositoryBridge>
        </SQLiteProvider>
      </Suspense>
    </DatabaseErrorBoundary>
  );
}

type DatabaseErrorBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
};

type DatabaseErrorBoundaryState = {
  error: Error | null;
};

class DatabaseErrorBoundary extends Component<
  DatabaseErrorBoundaryProps,
  DatabaseErrorBoundaryState
> {
  state: DatabaseErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.warn(
        'DartsSupportApp database initialization failed',
        error,
        errorInfo.componentStack,
      );
    }
  }

  render() {
    if (this.state.error) {
      return <DatabaseErrorView error={this.state.error} onRetry={this.props.onRetry} />;
    }
    return this.props.children;
  }
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
      {__DEV__ ? <Text style={{ marginTop: 8, color: '#991b1b' }}>{error.message}</Text> : null}
      <View style={{ marginTop: 12 }}>
        <Button label="再試行" onPress={onRetry} />
      </View>
    </View>
  );
}
