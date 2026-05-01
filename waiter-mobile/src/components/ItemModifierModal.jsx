import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native'
import { getModifierConfig, SPICE_LEVELS } from '../config/menuModifiers'

function SectionLabel({ children }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
      {children}
    </Text>
  )
}

function OptionBtn({ selected, onPress, emoji, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: selected ? '#2d5a2d' : '#e5e7eb',
        backgroundColor: selected ? '#f0f7f0' : '#fff',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={{ fontSize: 12, fontWeight: selected ? '700' : '500', color: selected ? '#2d5a2d' : '#555' }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export default function ItemModifierModal({ item, onConfirm, onCancel }) {
  const config = getModifierConfig(item)

  const [spice, setSpice] = useState(1)
  const [accompaniment, setAccompaniment] = useState('Naan')
  const [lassiStyle, setLassiStyle] = useState('Sweet')
  const [ice, setIce] = useState(true)

  if (!item || !config) return null

  const handleConfirm = () => {
    const modifier = {}
    if (config.spice) modifier.spice = spice
    if (config.accompaniment) modifier.accompaniment = accompaniment
    if (config.lassi) {
      modifier.style = lassiStyle
      modifier.ice = ice
    }
    onConfirm(modifier)
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 360, overflow: 'hidden' }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                Customise
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#1a1a1a' }} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={{ padding: 4, marginLeft: 10 }}>
              <Text style={{ fontSize: 22, color: '#9ca3af', lineHeight: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 20 }}>

            {/* ── Accompaniment ── */}
            {config.accompaniment && (
              <View>
                <SectionLabel>Served with</SectionLabel>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <OptionBtn selected={accompaniment === 'Naan'} onPress={() => setAccompaniment('Naan')} emoji="🫓" label="Naan" />
                  <OptionBtn selected={accompaniment === 'Rice'} onPress={() => setAccompaniment('Rice')} emoji="🍚" label="Rice" />
                </View>
              </View>
            )}

            {/* ── Spice level ── */}
            {config.spice && (
              <View>
                <SectionLabel>Spice Level</SectionLabel>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SPICE_LEVELS.map((s) => (
                    <OptionBtn
                      key={s.level}
                      selected={spice === s.level}
                      onPress={() => setSpice(s.level)}
                      emoji={s.emoji}
                      label={s.label}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ── Lassi style ── */}
            {config.lassi && (
              <>
                <View>
                  <SectionLabel>Style</SectionLabel>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <OptionBtn selected={lassiStyle === 'Sweet'} onPress={() => setLassiStyle('Sweet')} emoji="🍬" label="Sweet" />
                    <OptionBtn selected={lassiStyle === 'Salty'} onPress={() => setLassiStyle('Salty')} emoji="🧂" label="Salty" />
                  </View>
                </View>
                <View>
                  <SectionLabel>Ice</SectionLabel>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <OptionBtn selected={ice === true}  onPress={() => setIce(true)}  emoji="🧊" label="With Ice" />
                    <OptionBtn selected={ice === false} onPress={() => setIce(false)} emoji="🚫" label="No Ice" />
                  </View>
                </View>
              </>
            )}

          </ScrollView>

          {/* Footer buttons */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '600', color: '#555', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2d5a2d', alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '800', color: '#fff', fontSize: 14 }}>Add to Order</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}
