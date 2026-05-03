import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import useAppStore from '../store/useAppStore'
import { getBaseURL } from '../api'

// Maps table name prefix → seed image filename served by Express at /tables/
const SEED_IMAGE_FILES = {
  Karachi:     'Karachi.png',
  Lahori:      'Lahore.png',
  Islamabadi:  'Islamabad.png',
  Peshawari:   'Peshawar.png',
  Multani:     'multan.png',
  Faisalabadi: 'Faislabad.png',
  Rawalpindi:  'Rawalpindi.png',
  Hyderabadi:  'Hyderabad.png',
  Quetta:      'Quetta.png',
  Gujrati:     'Gujrat.png',
}

// Returns a /tables/Filename.png path — uploaded image wins, seed image is fallback.
// Both are served by Express, so both work identically to uploaded menu images.
function resolveTableImagePath(table) {
  if (table.image_path) return table.image_path
  const prefix = Object.keys(SEED_IMAGE_FILES).find((k) => table.name.startsWith(k))
  return prefix ? `/tables/${SEED_IMAGE_FILES[prefix]}` : null
}

const STATUS_STYLE = {
  empty:       { border: '#d1d5db', badge: '#6b7280', dot: '#9ca3af', label: 'Empty' },
  active:      { border: '#16a34a', badge: '#16a34a', dot: '#22c55e', label: 'Active' },
  inprogress:  { border: '#d97706', badge: '#d97706', dot: '#f59e0b', label: 'In Progress' },
  served:      { border: '#0d9488', badge: '#0d9488', dot: '#14b8a6', label: 'Served' },
  waiting:     { border: '#ea580c', badge: '#ea580c', dot: '#f97316', label: 'Waiting' },
}

function TableCard({ table, onPress, serverBase }) {
  const style = STATUS_STYLE[table.status] || STATUS_STYLE.empty
  const order = table.current_order

  // All images go through the Express server — same path as menu uploaded images (which work).
  // No require() vs {uri} switching; both seed and uploaded images use identical code.
  // ?v= cache-bust ensures a new timestamp filename always produces a fresh request.
  const imagePath = resolveTableImagePath(table)
  const imageUri = imagePath
    ? `${serverBase}${imagePath}?v=${encodeURIComponent(imagePath)}`
    : null

  return (
    <TouchableOpacity
      onPress={() => onPress(table)}
      activeOpacity={0.85}
      style={{
        flex: 1,
        margin: 6,
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: style.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        minHeight: 110,
      }}
    >
      {/* All images use {uri} via Express — same as menu images which are confirmed working */}
      {imageUri ? (
        <Image
          key={imageUri}
          source={{ uri: imageUri }}
          style={{ width: '100%', height: 70 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: '100%', height: 70, backgroundColor: '#e8e4dc', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 28 }}>🪑</Text>
        </View>
      )}

      <View style={{ padding: 10 }}>
        {/* Status dot */}
        <View style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: style.dot }} />

        {/* Table name */}
        <Text
          numberOfLines={2}
          style={{ fontWeight: '800', fontSize: 13, color: '#1a2e1a', textTransform: 'uppercase', letterSpacing: 0.3, paddingRight: 14, lineHeight: 18 }}
        >
          {table.name}
        </Text>

        {/* Status badge */}
        <View
          style={{
            marginTop: 6,
            alignSelf: 'flex-start',
            backgroundColor: style.badge,
            borderRadius: 20,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
            {style.label}
          </Text>
        </View>

        {/* Existing order summary */}
        {order && (
          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 }}>
            <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>
              {order.item_count} item{order.item_count !== 1 ? 's' : ''} · ₺{order.total_amount?.toLocaleString()}
            </Text>
            {order.kitchen_sent_at && (
              <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                Last punch: {new Date(order.kitchen_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function TableSelectScreen({ navigation }) {
  const { tables, loadTables, setSelectedTable, serverIp, disconnect } = useAppStore()
  const [refreshing, setRefreshing] = React.useState(false)
  const serverBase = getBaseURL()

  // Poll every 8 seconds so table statuses stay current across all devices
  useEffect(() => {
    loadTables()
    const id = setInterval(loadTables, 8000)
    return () => clearInterval(id)
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadTables()
    setRefreshing(false)
  }, [])

  const handleTablePress = (table) => {
    setSelectedTable(table)
    navigation.navigate('Menu')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2d5a2d' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#2d5a2d',
        }}
      >
        <View>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Tables</Text>
          <Text style={{ color: '#a8d5a8', fontSize: 11 }}>{serverIp}</Text>
        </View>
        <TouchableOpacity
          onPress={() => { disconnect(); navigation.replace('Connect') }}
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tables}
        keyExtractor={(t) => String(t.id)}
        numColumns={2}
        extraData={tables}
        style={{ backgroundColor: '#f5f0e8' }}
        contentContainerStyle={{ padding: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <TableCard table={item} onPress={handleTablePress} serverBase={serverBase} />}
      />
    </SafeAreaView>
  )
}
