import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors }  from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { normalize } from '../../utils/responsive';

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.container,
        focused && styles.containerFocused,
        error   && styles.containerError,
      ]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? Colors.primary : Colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <Ionicons name={rightIcon} size={18} color={Colors.textMuted} style={styles.icon} />
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:           { marginBottom: Spacing[4] },
  label:             { fontSize: normalize(14), fontWeight: '500', color: Colors.primary, marginBottom: Spacing[1] },
  container:         { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: Colors.border, paddingVertical: Spacing[2] },
  containerFocused:  { borderBottomColor: Colors.primary },
  containerError:    { borderBottomColor: Colors.error },
  icon:              { marginRight: Spacing[2] },
  input:             { flex: 1, fontSize: normalize(15), color: Colors.textPrimary, paddingVertical: 4 },
  error:             { fontSize: normalize(12), color: Colors.error, marginTop: 4 },
});