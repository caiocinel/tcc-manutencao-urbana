/** Campo de texto com rótulo em caixa alta, como nas telas de auth do web. */

import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ControlHeight, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

type Props = TextInputProps & {
  label?: string;
  /** Marca a borda como inválida (usado quando há erro no formulário). */
  invalid?: boolean;
  hint?: string;
  containerStyle?: ViewStyle;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, invalid, hint, containerStyle, style, multiline, ...props },
  ref,
) {
  const colors = useColors();
  const [focado, setFocado] = useState(false);

  const borderColor = invalid
    ? colors.error
    : focado
      ? colors.gold500
      : colors.borderDefault;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocado(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          props.onBlur?.(e);
        }}
        multiline={multiline}
        style={[
          styles.input,
          {
            borderColor,
            backgroundColor: colors.bgInput,
            color: colors.textPrimary,
            height: multiline ? undefined : ControlHeight,
            minHeight: multiline ? 96 : undefined,
            paddingTop: multiline ? Spacing[3] : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...props}
      />
      {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing[1],
  },
  label: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
  },
  hint: {
    fontSize: FontSize.xs,
  },
});
