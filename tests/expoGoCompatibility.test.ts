import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { selectSupportRepositoryMode } from '../src/features/support/repositoryMode';

const root = process.cwd();

test('iosとandroidではSQLite repositoryを選択し、webだけIndexedDB repositoryを選択する', () => {
  assert.equal(selectSupportRepositoryMode('ios'), 'sqlite');
  assert.equal(selectSupportRepositoryMode('android'), 'sqlite');
  assert.equal(selectSupportRepositoryMode('web'), 'indexeddb-web');
});

test('Expo Go向けのiOS権限説明文が日本語で設定されている', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const infoPlist = appJson.expo.ios.infoPlist;
  assert.match(infoPlist.NSCameraUsageDescription, /投擲フォーム動画/);
  assert.match(infoPlist.NSPhotoLibraryUsageDescription, /写真ライブラリ/);
  assert.match(infoPlist.NSPhotoLibraryAddUsageDescription, /写真ライブラリ/);
  assert.match(infoPlist.NSMicrophoneUsageDescription, /フォーム動画/);
});

test('実行ソースにlocalhostやWindows絶対パス依存がない', () => {
  const files = listFiles(['app', 'src', 'components', 'scripts'], ['.ts', '.tsx', '.js', '.cjs']);
  const forbiddenPatterns = [/localhost/i, /127\.0\.0\.1/, /file:\/\//i, /C:\\/, /制作データ/];

  const violations: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        violations.push(`${path.relative(root, file)}: ${pattern}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('ネイティブ実行ソースでWeb専用APIを直接参照しない', () => {
  const files = listFiles(['app', 'src', 'components'], ['.ts', '.tsx']);
  const violations = files
    .filter((file) => !file.endsWith('memoryRepository.ts'))
    .filter((file) => !file.endsWith('indexedDbRepository.ts'))
    .flatMap((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return [/window\./, /document\./, /localStorage/]
        .filter((pattern) => pattern.test(text))
        .map((pattern) => `${path.relative(root, file)}: ${pattern}`);
    });

  assert.deepEqual(violations, []);
});

test('実機起動用scriptが用意されている', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.start, 'expo start');
  assert.equal(packageJson.scripts['start:lan'], 'expo start --lan');
  assert.equal(packageJson.scripts['start:tunnel'], 'expo start --tunnel');
  assert.equal(packageJson.scripts['start:clear'], 'expo start -c');
});

test('SQLiteProviderでuseSuspenseとonErrorを併用しない', () => {
  const providerSource = fs.readFileSync(
    path.join(root, 'src/features/support/SupportDatabaseProvider.tsx'),
    'utf8',
  );

  assert.match(providerSource, /<SQLiteProvider[\s\S]*useSuspense/);
  assert.doesNotMatch(providerSource, /<SQLiteProvider[\s\S]*onError=/);
  assert.match(providerSource, /DatabaseErrorBoundary/);
});

function listFiles(directories: string[], extensions: string[]): string[] {
  const files: string[] = [];
  for (const directory of directories) {
    walk(path.join(root, directory), files, extensions);
  }
  return files;
}

function walk(current: string, files: string[], extensions: string[]) {
  if (!fs.existsSync(current)) {
    return;
  }
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(current)) {
      walk(path.join(current, child), files, extensions);
    }
    return;
  }
  if (extensions.includes(path.extname(current))) {
    files.push(current);
  }
}
