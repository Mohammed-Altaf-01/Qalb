import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import useGamification from '../lib/useGamification';
import { pullAccountScopedStorageIntoDevice } from '../lib/user-app-sync';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { isSignedIn, userId, signIn, signOut } = useAuth();
  const { state, levelInfo } = useGamification();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Account</Text>
        {isSignedIn ? (
          <>
            <Text style={styles.body}>Signed in</Text>
            {userId ? <Text style={styles.mono}>{userId}</Text> : null}
            <TouchableOpacity
              style={styles.btn}
              onPress={async () => {
                const r = await pullAccountScopedStorageIntoDevice();
                Alert.alert('Sync', r.cloudEnabled ? 'Cloud data merged.' : 'Cloud storage unavailable or not signed in.');
              }}
            >
              <Text style={styles.btnTxt}>Sync cloud data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={signOut}>
              <Text style={styles.btnSecondaryTxt}>Sign out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.body}>Sign in with the same Quran Foundation account as the website to sync reading data.</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={async () => {
                const r = await signIn();
                if (!r?.ok) Alert.alert('Sign in', r?.error ?? 'Could not complete sign-in.');
              }}
            >
              <Text style={styles.btnTxt}>Sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Gamification</Text>
        <Text style={styles.body}>
          Level {levelInfo?.level ?? 1} · {state?.xp ?? 0} XP
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>More</Text>
        <View style={styles.moreList}>
          {[
            ['Journey', 'Journey'],
            ['Library', 'Library'],
            ['Goals', 'Goals'],
            ['Ahadith', 'AhadithBooks'],
            ['Settings', 'Settings'],
            ['Tools & shortcuts', 'Menu'],
          ].map(([label, screen]) => (
            <TouchableOpacity
              key={screen}
              style={styles.moreRow}
              onPress={() => navigation.navigate(screen)}
              activeOpacity={0.75}
            >
              <Text style={styles.moreRowTxt}>{label}</Text>
              <Text style={styles.linkChev}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  title: { fontSize: FONT_SIZE.xxl + 2, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  label: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm },
  body: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  mono: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs, fontFamily: 'Menlo' },
  btn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  btnTxt: { color: '#0d1a13', fontWeight: '700', fontSize: FONT_SIZE.sm },
  btnSecondary: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryTxt: { color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZE.sm },
  moreList: { gap: SPACING.xs, marginTop: SPACING.sm },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moreRowTxt: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  linkChev: { color: COLORS.accent, fontSize: 16 },
});
