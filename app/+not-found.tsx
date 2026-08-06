import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Page, useTheme } from '../components/ui';

export default function NotFoundScreen() {
  const theme = useTheme();
  return (
    <Page title="画面が見つかりません" subtitle="指定された画面はこのアプリにありません。">
      <Card>
        <Text style={{ color: theme.muted, lineHeight: 20 }}>
          アプリの読み込み直後や古いURLから開いた場合は、今日の練習へ戻ってください。
        </Text>
        <View style={{ marginTop: 12 }}>
          <Link href="/today" asChild>
            <Button label="今日の練習へ戻る" onPress={() => undefined} />
          </Link>
        </View>
      </Card>
    </Page>
  );
}
