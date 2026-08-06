import type { PlatformOSType } from 'react-native';

export type RepositoryMode = 'sqlite' | 'memory-web-preview';

export function selectSupportRepositoryMode(platform: PlatformOSType): RepositoryMode {
  return platform === 'web' ? 'memory-web-preview' : 'sqlite';
}
