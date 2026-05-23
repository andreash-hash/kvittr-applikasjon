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
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            minHeight: 280,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#E2E8F0',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          <Text
            style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 20 }}
          >
            {title}
          </Text>

          {fieldType === 'text' && (
            <TextInput
              value={localValue}
              onChangeText={setLocalValue}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: '#0F172A',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20,
              }}
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
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: '#0F172A',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20,
              }}
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
                    backgroundColor: localValue === opt.value ? '#6366F1' : '#F8FAFC',
                    borderColor: localValue === opt.value ? '#6366F1' : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '500',
                      color: localValue === opt.value ? '#fff' : '#0F172A',
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
                borderColor: '#E2E8F0',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '500', color: '#64748B' }}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(localValue)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: '#6366F1',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '600', color: '#fff' }}>Lagre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
