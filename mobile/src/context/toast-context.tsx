/**
 * Toasts — porte de `frontend/src/components/Toast.jsx`.
 * Empilha até 3 mensagens no topo da tela, cada uma some sozinha em 3s.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<((message: string, type?: ToastType) => void) | null>(null);

const DURACAO_MS = 3000;
const MAX_VISIVEIS = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type }].slice(-MAX_VISIVEIS));
      setTimeout(() => dismiss(id), DURACAO_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => addToast, [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { top: insets.top + Spacing[2] }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const colors = useColors();
  // useState (e não useRef) porque o valor é lido durante o render, dentro do
  // style — refs não podem ser acessadas nessa fase.
  const [entrada] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [entrada]);

  const accent =
    toast.type === 'error' ? colors.error : toast.type === 'info' ? colors.info : colors.success;

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [
          { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
        ],
      }}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        style={[
          styles.toast,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderDefault,
            borderLeftColor: accent,
          },
        ]}>
        <Text style={[styles.message, { color: colors.textPrimary }]}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    gap: Spacing[2],
    zIndex: 9999,
  },
  toast: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  message: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
