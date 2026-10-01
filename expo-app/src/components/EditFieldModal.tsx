import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export type FieldType = 'text' | 'numeric' | 'date' | 'segmented';

export interface SegmentOption {
  value: string;
  label: string;
}

interface EditFieldModalProps {
  visible: boolean;
  title: string;
  fieldType: FieldType;
  value: string;
  segmentOptions?: SegmentOption[];
  onClose: () => void;
  onSave: (value: string) => void;
}

export function EditFieldModal({
  visible,
  title,
  fieldType,
  value,
  segmentOptions,
  onClose,
  onSave,
}: EditFieldModalProps) {
  const [localValue, setLocalValue] = useState(value);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Semantic colour tokens — keeps JSX clean and changes in one place
  const c = {
    sheet:        isDark ? '#0F1729' : '#FFFFFF',
    handle:       isDark ? '#1E2A45' : '#E2E8F0',
    title:        isDark ? '#F1F5F9' : '#0F172A',
    inputBg:      isDark ? '#1E2A45' : '#F8FAFC',
    inputText:    isDark ? '#F1F5F9' : '#0F172A',
    inputBorder:  isDark ? '#2D3F5E' : '#E2E8F0',
    segActive:    '#6366F1',
    segActiveTxt: '#FFFFFF',
    segIdleBg:    isDark ? '#1E2A45' : '#F8FAFC',
    segIdleBorder:isDark ? '#2D3F5E' : '#E2E8F0',
    segIdleTxt:   isDark ? '#CBD5E1' : '#0F172A',
    cancelBorder: isDark ? '#2D3F5E' : '#E2E8F0',
    cancelTxt:    isDark ? '#94A3B8' : '#64748B',
    saveBg:       '#6366F1',
    saveTxt:      '#FFFFFF',
  };

  useEffect(() => {
    if (visible) setLocalValue(value);
  }, [visible, value]);

  const dateValue = (() => {
    if (fieldType !== 'date') return new Date();
    try {
      const d = new Date(localValue || new Date().toISOString().split('T')[0]);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: c.sheet,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            minHeight: 280,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: c.handle,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: c.title,
              marginBottom: 20,
            }}
          >
            {title}
          </Text>

          {fieldType === 'text' && (
            <TextInput
              value={localValue}
              onChangeText={setLocalValue}
              style={{
                backgroundColor: c.inputBg,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: c.inputText,
                borderWidth: 1,
                borderColor: c.inputBorder,
                marginBottom: 20,
              }}
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => onSave(localValue)}
            />
          )}

          {fieldType === 'numeric' && (
            <TextInput
              value={localValue}
              onChangeText={setLocalValue}
              style={{
                backgroundColor: c.inputBg,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: c.inputText,
                borderWidth: 1,
                borderColor: c.inputBorder,
                marginBottom: 20,
              }}
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              keyboardType="decimal-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => onSave(localValue)}
            />
          )}

          {fieldType === 'date' && (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="spinner"
              // themeVariant drives the spinner's own dark/light appearance so
              // it always matches the sheet — prevents dark spinner on light
              // sheet (or vice versa) regardless of system colour scheme.
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setLocalValue(selectedDate.toISOString().split('T')[0]);
                }
              }}
              locale="nb-NO"
              style={{ marginBottom: 8 }}
            />
          )}

          {fieldType === 'segmented' && segmentOptions && (
            <ScrollView style={{ marginBottom: 20 }} showsVerticalScrollIndicator={false}>
              {segmentOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setLocalValue(opt.value)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 8,
                    backgroundColor:
                      localValue === opt.value ? c.segActive : c.segIdleBg,
                    borderColor:
                      localValue === opt.value ? c.segActive : c.segIdleBorder,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '500',
                      color:
                        localValue === opt.value ? c.segActiveTxt : c.segIdleTxt,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.cancelBorder,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '500', color: c.cancelTxt }}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(localValue)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: c.saveBg,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '600', color: c.saveTxt }}>Lagre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
