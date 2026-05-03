import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import useAppStore from '../store/useAppStore'
import { getBaseURL } from '../api'
import menuImages from '../menuImages'
import { needsModifier, formatModifier } from '../config/menuModifiers'
import ItemModifierModal from '../components/ItemModifierModal'

const STATUS_STYLE = {
  empty:      { badge: '#6b7280', label: 'Empty' },
  active:     { badge: '#16a34a', label: 'Active' },
  inprogress: { badge: '#d97706', label: 'In Progress' },
  served:     { badge: '#0d9488', label: 'Served' },
  waiting:    { badge: '#ea580c', label: 'Waiting' },
}

function CategoryTab({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: selected ? '#2d5a2d' : '#e8e4dc',
        borderWidth: selected ? 0 : 1,
        borderColor: '#d1d5db',
      }}
      activeOpacity={0.8}
    >
      <Text style={{ color: selected ? '#fff' : '#555', fontWeight: selected ? '700' : '500', fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function ItemCard({ item, cartQty, onAdd, onRemove, hasModifier }) {
  const localImage = item.image_path ? menuImages[item.image_path] : null
  const isOutOfStock = item.in_stock === 0
  // Cache-bust hash so updated images are refetched
  // Use updated_at/created_at if available, otherwise fall back to path hash
  const pathHash = item.image_path
    ? Math.abs(item.image_path.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0))
        .toString(36).slice(-6)
    : ''
  const cacheKey = item.updated_at || item.created_at || pathHash

  return (
    <View
      style={{
        flex: 1,
        margin: 5,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: cartQty > 0 ? '#2d5a2d' : '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        opacity: isOutOfStock ? 0.6 : 1,
      }}
    >
      {/* Image or emoji placeholder */}
      {localImage ? (
        <Image
          source={localImage}
          style={{ width: '100%', height: 90 }}
          resizeMode="cover"
        />
      ) : item.image_path && item.image_path.startsWith('/') ? (
        // HTTP image for uploaded images — always via Express server with cache-bust
        <Image
          source={{ uri: `${getBaseURL()}${item.image_path}?v=${encodeURIComponent(cacheKey)}` }}
          style={{ width: '100%', height: 90 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: '100%', height: 90, backgroundColor: '#f3f0e8', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36 }}>{item.image_path && !item.image_path.startsWith('/') ? item.image_path : '🍽️'}</Text>
        </View>
      )}

      {/* Out of Stock overlay */}
      {isOutOfStock && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#dc2626',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>OUT OF STOCK</Text>
          </View>
        </View>
      )}

      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={{ fontWeight: '600', fontSize: 13, color: '#1a1a1a', minHeight: 36 }}>
          {item.name}
        </Text>
        <Text style={{ color: '#5a7a5a', fontWeight: '700', fontSize: 13, marginTop: 4 }}>
          ₺{item.price.toFixed(2)}
        </Text>

        {/* Add / remove controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
          {/* For modifier items, show total qty badge but no − on card */}
          {cartQty > 0 && !hasModifier && (
            <>
              <TouchableOpacity
                onPress={onRemove}
                disabled={isOutOfStock}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', opacity: isOutOfStock ? 0.5 : 1 }}
              >
                <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 16, lineHeight: 18 }}>−</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 10, fontWeight: '700', fontSize: 15, color: '#1a1a1a', minWidth: 18, textAlign: 'center' }}>
                {cartQty}
              </Text>
            </>
          )}
          {cartQty > 0 && hasModifier && (
            <Text style={{ marginRight: 10, fontWeight: '700', fontSize: 13, color: '#2d5a2d' }}>
              {cartQty} in cart
            </Text>
          )}
          <TouchableOpacity
            onPress={() => !isOutOfStock && onAdd()}
            disabled={isOutOfStock}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isOutOfStock ? '#d1d5db' : '#2d5a2d', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, lineHeight: 18 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function MenuScreen({ navigation }) {
  const {
    selectedTable,
    menu,
    categories,
    selectedCategory,
    setSelectedCategory,
    cart,
    addToCart,
    removeFromCart,
    specialInstructions,
    setSpecialInstructions,
    punchOrder,
    punchLoading,
    punchError,
    loadTables,
    refreshMenu,
  } = useAppStore()

  const [pendingItem, setPendingItem] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshMenu = async () => {
    setRefreshing(true)
    try {
      await refreshMenu()
    } catch (err) {
      console.error('Failed to refresh menu:', err)
    }
    setRefreshing(false)
  }

  // Poll every 5 seconds so this waiter sees if another waiter punches the same table
  useEffect(() => {
    const id = setInterval(loadTables, 5000)
    return () => clearInterval(id)
  }, [])

  // Refresh menu when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshMenu()
    }, [refreshMenu])
  )

  const statusStyle = STATUS_STYLE[selectedTable?.status] || STATUS_STYLE.empty
  const existingOrder = selectedTable?.current_order

  const filteredItems = useMemo(
    () => menu.filter((i) => i.category === selectedCategory),
    [menu, selectedCategory]
  )

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  // Sum all cart entries for an item (could have multiple modifier variants)
  const getCartQty = (id) => cart.filter((c) => c.id === id).reduce((sum, c) => sum + c.qty, 0)

  const handleAdd = (item) => {
    if (needsModifier(item)) {
      setPendingItem(item)
    } else {
      addToCart(item, null)
    }
  }

  const handlePunch = async () => {
    if (cart.length === 0) return
    const result = await punchOrder()
    if (result.success) {
      await loadTables()
      Alert.alert(
        'Order Punched!',
        result.isNew
          ? `New order #${result.orderId} sent to kitchen.`
          : `Items added to order #${result.orderId}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2d5a2d' }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: '#2d5a2d', paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: '#a8d5a8', fontSize: 22, fontWeight: '300' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
              {selectedTable?.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={handleRefreshMenu}
              disabled={refreshing}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: refreshing ? '#1a3a1a' : '#3d7a3d',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
                opacity: refreshing ? 0.7 : 1,
              }}
              activeOpacity={0.75}
            >
              {refreshing
                ? <ActivityIndicator size="small" color="#a8d5a8" />
                : <Text style={{ color: '#a8d5a8', fontSize: 16 }}>⟳</Text>
              }
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Text>
            </TouchableOpacity>
            <View style={{ backgroundColor: statusStyle.badge, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{statusStyle.label}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: '#f5f0e8' }}>
        {/* Existing order summary (read-only) */}
        {existingOrder && existingOrder.item_count > 0 && (
          <View style={{ backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a', padding: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Already Ordered · Rs {existingOrder.total_amount?.toLocaleString()}
            </Text>
            {existingOrder.items
              .filter((i) => !i.cancelled)
              .map((i, idx) => (
                <Text key={idx} style={{ fontSize: 12, color: '#78350f' }}>
                  {i.qty}× {i.name}
                </Text>
              ))}
          </View>
        )}

        {/* Category tabs */}
        <View style={{ backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
            {categories.map((cat) => (
              <CategoryTab
                key={cat}
                label={cat}
                selected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Item grid */}
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => String(i.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 180 }}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              cartQty={getCartQty(item.id)}
              hasModifier={needsModifier(item)}
              onAdd={() => handleAdd(item)}
              onRemove={() => {
                const entry = cart.find((c) => c.id === item.id)
                if (entry) removeFromCart(entry.cartKey)
              }}
            />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 }}>
              No items in this category
            </Text>
          }
        />
      </View>

      {/* Bottom cart panel */}
      {cartCount > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Cart items list — each variant on its own line */}
          {cart.map((c) => (
            <View key={c.cartKey} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <TouchableOpacity
                onPress={() => removeFromCart(c.cartKey)}
                style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
              >
                <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13, lineHeight: 14 }}>−</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#333', fontWeight: '600' }} numberOfLines={1}>
                  {c.qty}× {c.name}
                </Text>
                {c.modifier && (
                  <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                    {formatModifier(c.modifier)}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 13, color: '#555', fontWeight: '600', marginLeft: 8 }}>
                ₺{(c.price * c.qty).toFixed(2)}
              </Text>
            </View>
          ))}

          {/* Special instructions */}
          <TextInput
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Special instructions (optional)"
            placeholderTextColor="#bbb"
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 8,
              padding: 8,
              fontSize: 13,
              color: '#333',
              marginTop: 8,
              marginBottom: 10,
              backgroundColor: '#fafafa',
            }}
          />

          {!!punchError && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 6 }}>{punchError}</Text>
          )}

          {/* Punch button */}
          <TouchableOpacity
            onPress={handlePunch}
            disabled={punchLoading}
            style={{
              backgroundColor: punchLoading ? '#9ca3af' : '#dc2626',
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            {punchLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>
                  PUNCH ORDER
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 }}>
                  · ₺{cartTotal.toLocaleString()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      {/* Modifier modal */}
      {pendingItem && (
        <ItemModifierModal
          item={pendingItem}
          onConfirm={(modifier) => {
            addToCart(pendingItem, modifier)
            setPendingItem(null)
          }}
          onCancel={() => setPendingItem(null)}
        />
      )}
    </SafeAreaView>
  )
}
