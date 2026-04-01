import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors }  from '../../theme/colors';
import { Radius }  from '../../theme/radius';
import { Spacing } from '../../theme/spacing';
import { normalize } from '../../utils/responsive';

export default function Button({
  label,
  onPress,
  variant   = 'primary',
  loading   = false,
  disabled  = false,
  style,
  textStyle,
  fullWidth = true,
}) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[variant],
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} />
      ) : (
        <Text style={[styles.text, styles[variant + 'Text'], textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:          { borderRadius: Radius.full, paddingVertical: Spacing[4], alignItems: 'center', justifyContent: 'center' },
  primary:       { backgroundColor: Colors.primary },
  secondary:     { backgroundColor: Colors.primaryBg, borderWidth: 1.5, borderColor: Colors.primary },
  ghost:         { backgroundColor: 'transparent' },
  danger:        { backgroundColor: Colors.error },
  disabled:      { opacity: 0.5 },
  text:          { fontSize: normalize(16), fontWeight: '700' },
  primaryText:   { color: Colors.white },
  secondaryText: { color: Colors.primary },
  ghostText:     { color: Colors.primary },
  dangerText:    { color: Colors.white },
});