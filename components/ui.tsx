import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return {
    dark,
    bg: dark ? '#0f172a' : '#f8fafc',
    surface: dark ? '#111827' : '#ffffff',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? '#94a3b8' : '#64748b',
    border: dark ? '#334155' : '#dbe3ef',
    accent: '#0f766e',
    accentSoft: dark ? '#134e4a' : '#ccfbf1',
    danger: '#b91c1c',
    warning: '#b45309',
  };
}

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const background =
    variant === 'primary'
      ? theme.accent
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.accentSoft
          : 'transparent';
  const color =
    variant === 'primary' || variant === 'danger'
      ? '#ffffff'
      : variant === 'secondary'
        ? theme.text
        : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? '#94a3b8' : background,
          borderColor: variant === 'ghost' ? theme.border : background,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          props.multiline ? styles.multiline : null,
          props.style,
        ]}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: theme.border }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, { backgroundColor: active ? theme.accent : 'transparent' }]}
          >
            <Text style={{ color: active ? '#ffffff' : theme.text, fontWeight: '700' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <Card>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>{body}</Text>
    </Card>
  );
}

export function Loading() {
  return (
    <View style={{ padding: 32 }}>
      <ActivityIndicator />
    </View>
  );
}

export const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  button: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 15,
  },
  field: {
    marginVertical: 6,
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
  },
  multiline: {
    minHeight: 94,
    textAlignVertical: 'top',
  },
  segmented: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 6,
  },
  segment: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
});
