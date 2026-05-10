import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getTextSizePreset, setTextSizePreset, TEXT_SIZE_PRESETS } from '../lib/text-settings';
import { schedulePushPreferences } from '../lib/user-app-sync';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

export default function SettingsScreen({ navigation }) {
  const { isSignedIn, signIn, signOut } = useAuth();
  const [selected, setSelected] = useState('medium');

  useEffect(() => {
    getTextSizePreset().then((preset) => setSelected(preset.key));
  }, []);

  const apply = async (key) => {
    setSelected(key);
    await setTextSizePreset(key);
    schedulePushPreferences();
  };

  const onSignIn = async () => {
    const r = await signIn();
    if (!r?.ok) Alert.alert('Sign in', r?.error ?? 'Could not complete sign-in.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Reading and display preferences</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isSignedIn ? (
          <>
            <Text style={styles.sectionHint}>You are signed in. Cloud sync runs after sign-in and when you change data.</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
              <Text style={styles.signOutTxt}>Sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.linkTxt}>Open profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionHint}>Sign in with the same account as the website to sync reading data.</Text>
            <TouchableOpacity style={styles.signInBtn} onPress={onSignIn}>
              <Text style={styles.signInTxt}>Sign in with browser</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Text Size</Text>
        <Text style={styles.sectionHint}>Adjust Arabic and translation sizes across the app.</Text>
        <View style={styles.options}>
          {Object.values(TEXT_SIZE_PRESETS).map((preset) => (
            <TouchableOpacity
              key={preset.key}
              onPress={() => apply(preset.key)}
              style={[styles.option, selected === preset.key && styles.optionActive]}
            >
              <Text style={[styles.optionText, selected === preset.key && styles.optionTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xxl + 4, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },
  card: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  sectionHint: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
  options: { flexDirection: 'row', gap: SPACING.sm },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.muted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: `${COLORS.accent}50`,
  },
  optionText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  optionTextActive: { color: COLORS.accent },
  signInBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  signInTxt: { color: '#0d1a13', fontWeight: '700', fontSize: FONT_SIZE.sm },
  signOutBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signOutTxt: { color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZE.sm },
  linkBtn: { marginTop: SPACING.sm, alignItems: 'center' },
  linkTxt: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
