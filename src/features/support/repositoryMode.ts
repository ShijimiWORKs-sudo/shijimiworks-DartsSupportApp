import type { PlatformOSType } from 'react-native';

export type RepositoryMode = 'sqlite' | 'indexeddb-web';

export function selectSupportRepositoryMode(platform: PlatformOSType): RepositoryMode {
  return platform === 'web' ? 'indexeddb-web' : 'sqlite';
}
