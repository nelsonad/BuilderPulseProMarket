import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerMenu: {
    alignItems: 'flex-end',
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 16,
  },
  profileMenu: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
  profileMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  profileMenuText: {
    fontWeight: '600',
    color: '#111827',
  },
  shell: {
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#e0e7ff',
    color: '#1e3a8a',
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#4b5563',
  },
  meta: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextSecondary: {
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
  form: {
    gap: 10,
  },
  label: {
    fontWeight: '600',
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  error: {
    color: '#b42318',
    fontSize: 13,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef0f4',
    backgroundColor: '#f9fafc',
  },
  listTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  listMeta: {
    color: '#6b7280',
    marginTop: 4,
  },
  detailGrid: {
    gap: 8,
  },
  detailText: {
    color: '#374151',
  },
});
