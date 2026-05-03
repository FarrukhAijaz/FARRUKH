import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import useAppStore from '../store/useAppStore'

export default function ConnectScreen({ navigation }) {
  const [ip, setIp] = useState('')
  const { connect, loading, connectError } = useAppStore()

  const handleConnect = async () => {
    if (!ip.trim()) return
    const result = await connect(ip.trim())
    // useAppStore sets connected=true on success
    // We watch it via subscription in App.js, but we can also just check state after
  }

  // Watch connected state to auto-navigate
  const connected = useAppStore((s) => s.connected)
  React.useEffect(() => {
    if (connected) navigation.replace('TableSelect')
  }, [connected])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f0e8' }} edges={['top']}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f5f0e8' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / title */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#1a2e1a', letterSpacing: 1 }}>
            WAITER
          </Text>
          <Text style={{ fontSize: 14, color: '#5a7a5a', marginTop: 4 }}>
            Connect to your POS desktop
          </Text>
        </View>

        {/* Card */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Desktop IP Address
          </Text>
          <TextInput
            value={ip}
            onChangeText={setIp}
            placeholder="e.g. 192.168.1.15"
            placeholderTextColor="#bbb"
            keyboardType="decimal-pad"
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={handleConnect}
            style={{
              borderWidth: 1.5,
              borderColor: connectError ? '#ef4444' : '#d1d5db',
              borderRadius: 10,
              padding: 14,
              fontSize: 18,
              color: '#1a1a1a',
              backgroundColor: '#fafafa',
              letterSpacing: 1,
            }}
          />

          {!!connectError && (
            <Text style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>
              {connectError}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleConnect}
            disabled={loading || !ip.trim()}
            style={{
              marginTop: 20,
              backgroundColor: loading || !ip.trim() ? '#9ca3af' : '#2d5a2d',
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                Connect
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 24, fontSize: 12 }}>
          Make sure your phone and the PC{'\n'}are on the same Wi-Fi network
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
