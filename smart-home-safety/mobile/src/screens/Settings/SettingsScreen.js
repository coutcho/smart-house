import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSafety } from '../../context/SafetyContext';
import { api } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { Settings2, UserRound, Phone, Server, LogOut, Flame, Zap, ShieldCheck } from 'lucide-react-native';

export const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const { houseId, setHouseId, refresh } = useSafety();

  const [backendUrl, setBackendUrl] = useState(api.baseUrl);
  const [houseInput, setHouseInput] = useState(houseId);

  const handleSaveConfig = () => {
    api.setBaseUrl(backendUrl);
    setHouseId(houseInput);
    refresh();
    Alert.alert('Configuration Saved', 'Backend API URL and House ID updated.');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.screenHeading}><View style={styles.headingIcon}><Settings2 size={19} color={COLORS.primary} /></View><View><Text style={styles.headerTitle}>Settings</Text><Text style={styles.headingSubtitle}>Manage your home and account</Text></View></View>

      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}><UserRound size={16} color={COLORS.primary} /><Text style={styles.cardHeader}>Resident profile</Text></View>
        <Text style={styles.userName}>{user?.displayName || 'Resident'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'resident@safehome.dz'}</Text>
        <Text style={styles.userId}>UID: {user?.uid}</Text>
      </View>

      {/* Emergency Contacts (Algeria) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}><Phone size={16} color={COLORS.warning} /><Text style={styles.cardHeader}>Emergency hotlines · Algeria</Text></View>
        <View style={styles.contactItem}>
          <View style={styles.contactTitle}><Flame size={15} color={COLORS.critical} /><Text style={styles.contactName}>Protection Civile (SOS Pompiers)</Text></View>
          <Text style={styles.contactNumber}>14</Text>
        </View>
        <View style={styles.contactItem}>
          <View style={styles.contactTitle}><Zap size={15} color={COLORS.warning} /><Text style={styles.contactName}>Sonelgaz (Urgence Gaz)</Text></View>
          <Text style={styles.contactNumber}>3303</Text>
        </View>
        <View style={styles.contactItem}>
          <View style={styles.contactTitle}><ShieldCheck size={15} color={COLORS.primary} /><Text style={styles.contactName}>Police / Sûreté Nationale</Text></View>
          <Text style={styles.contactNumber}>17 / 1548</Text>
        </View>
      </View>

      {/* Network Configuration */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}><Server size={16} color={COLORS.primary} /><Text style={styles.cardHeader}>Backend network endpoint</Text></View>
        <Text style={styles.hint}>
          Configure your server endpoint (e.g. for testing with Expo Go on a phone over Wi-Fi):
        </Text>
        <TextInput
          style={styles.input}
          value={backendUrl}
          onChangeText={setBackendUrl}
          autoCapitalize="none"
          placeholder="http://192.168.1.100:5000/api/v1"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={[styles.cardHeader, { marginTop: 12 }]}>Monitored House ID</Text>
        <TextInput
          style={styles.input}
          value={houseInput}
          onChangeText={setHouseInput}
          autoCapitalize="characters"
          placeholder="HOUSE_001"
          placeholderTextColor={COLORS.textMuted}
        />

        <TouchableOpacity style={styles.btnSave} onPress={handleSaveConfig}>
          <Text style={styles.btnSaveText}>Save Network Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
        <LogOut size={17} color={COLORS.textDanger} /><Text style={styles.btnLogoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 0,
  },
  screenHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  headingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  headingSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  contactTitle: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  contactNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.warning,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  btnSave: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  btnSaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnLogout: {
    backgroundColor: COLORS.criticalDark,
    borderColor: COLORS.critical,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnLogoutText: {
    color: COLORS.textDanger,
    fontSize: 14,
    fontWeight: '700',
  },
});
