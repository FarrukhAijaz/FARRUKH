import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { app } from 'electron'
import { join } from 'path'
import { createHash } from 'crypto'

let db

const DEFAULT_ATTENDANCE_SETTINGS = {
  attendance_challenge_ttl_seconds: 45,
  attendance_allowed_subnet_prefixes: [],
  attendance_require_selfie: 'false'
}

function getDatabase() {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'waiter-pos-db.json')
    const adapter = new FileSync(dbPath)
    db = low(adapter)

    // Set schema defaults (seeds on first run)
    db.defaults({
      tables: [],
      menu_items: [],
      orders: [],
      payments: [],
      staff: [],
      attendance_events: [],
      attendance_challenges: [],
      device_enrollments: [],
      attendance_audit: [],
      settings: {
        printer_mock: 'true',
        printer_type: 'network',
        printer_interface: '192.168.1.100:9100',
        ...DEFAULT_ATTENDANCE_SETTINGS
      },
      _counters: {
        orders: 0,
        payments: 0,
        takeaway: 0,
        staff: 0,
        attendance_events: 0,
        attendance_challenges: 0,
        attendance_audit: 0,
        device_enrollments: 0
      }
    }).write()

    const currentSettings = db.get('settings').value()
    db.set('settings', {
      ...DEFAULT_ATTENDANCE_SETTINGS,
      ...currentSettings
    }).write()

    const currentCounters = db.get('_counters').value() || {}
    db.set('_counters', {
      orders: 0,
      payments: 0,
      takeaway: 0,
      staff: 0,
      attendance_events: 0,
      attendance_challenges: 0,
      attendance_audit: 0,
      device_enrollments: 0,
      ...currentCounters
    }).write()

    for (const key of ['staff', 'attendance_events', 'attendance_challenges', 'device_enrollments', 'attendance_audit']) {
      if (!Array.isArray(db.get(key).value())) {
        db.set(key, []).write()
      }
    }

    // Seed tables if empty
    if (db.get('tables').value().length === 0) {
      const tableNames = [
        'Karachi Corner', 'Lahori Mehfil', 'Islamabadi Lounge', 'Peshawari Baithak',
        'Multani Dastarkhwan', 'Faisalabadi Point', 'Rawalpindi Adda', 'Hyderabadi Haveli',
        'Quetta Chaman', 'Gujrati Darbar'
      ]
      const tables = tableNames.map((name, i) => ({
        id: i + 1,
        name,
        status: 'empty',
        current_order_id: null
      }))
      db.set('tables', tables).write()
    }

    // Seed menu items if empty
    if (db.get('menu_items').value().length === 0) {
      const items = [
        // ── Palate Teasers ────────────────────────────────────────
        { id:  1, name: 'Samosa',                              category: 'Palate Teasers',     price: 110,  image_path: '/menu/appetizers/samosa.jpg' },
        { id:  2, name: 'French Fries',                        category: 'Palate Teasers',     price: 90,   image_path: '/menu/appetizers/french-fries.jpg' },
        { id:  3, name: 'Samosa Chaat',                        category: 'Palate Teasers',     price: 150,  image_path: '/menu/appetizers/samosa-chaat.jpg' },
        { id:  4, name: 'Pani Puri',                           category: 'Palate Teasers',     price: 180,  image_path: '/menu/appetizers/pani-puri.jpg' },
        { id:  5, name: 'Garlic Mayo Fries',                   category: 'Palate Teasers',     price: 120,  image_path: '/menu/appetizers/garlic-mayo-fries.jpg' },

        // ── Heart of the Feast ────────────────────────────────────
        { id:  6, name: 'Biryani',                             category: 'Heart of the Feast', price: 340,  image_path: '/menu/main-course/biryani.jpg' },
        { id:  7, name: 'Mandi',                               category: 'Heart of the Feast', price: 385,  image_path: '/menu/main-course/mandi.jpg' },
        { id:  8, name: 'Butter Chicken',                      category: 'Heart of the Feast', price: 385,  image_path: '/menu/main-course/butter-chicken.jpg' },
        { id:  9, name: "Chef's Daily Special",                category: 'Heart of the Feast', price: 250,  image_path: '/menu/main-course/chefs-special.jpg' },
        { id: 10, name: 'Beef Karahi 1kg (3–4 ppl)',           category: 'Heart of the Feast', price: 3200, image_path: '/menu/main-course/beef-karahi.jpg' },
        { id: 11, name: 'Beef Karahi ½kg (2–3 ppl)',           category: 'Heart of the Feast', price: 1800, image_path: '/menu/main-course/beef-karahi.jpg' },
        { id: 12, name: 'Beef Laccha Paratha Burger',          category: 'Heart of the Feast', price: 495,  image_path: '/menu/main-course/beef-laccha-burger.jpg' },
        { id: 13, name: 'Chicken Laccha Paratha Burger',       category: 'Heart of the Feast', price: 290,  image_path: '/menu/main-course/chicken-laccha-burger.jpg' },

        // ── Ancient Flames ────────────────────────────────────────
        { id: 14, name: 'Plain Naan',                          category: 'Ancient Flames',     price: 55,   image_path: '/menu/hot-tandoor/plain-naan.jpg' },
        { id: 15, name: 'Garlic Naan',                         category: 'Ancient Flames',     price: 65,   image_path: '/menu/hot-tandoor/garlic-naan.jpg' },
        { id: 16, name: 'Garlic Cheese Naan',                  category: 'Ancient Flames',     price: 170,  image_path: '/menu/hot-tandoor/garlic-cheese-naan.jpg' },
        { id: 17, name: 'Plain Paratha',                       category: 'Ancient Flames',     price: 45,   image_path: '/menu/hot-tandoor/plain-paratha.jpg' },
        { id: 18, name: 'Aloo Paratha',                        category: 'Ancient Flames',     price: 120,  image_path: '/menu/hot-tandoor/aloo-paratha.jpg' },
        { id: 19, name: 'Chicken Cheese Paratha',              category: 'Ancient Flames',     price: 180,  image_path: '/menu/hot-tandoor/chicken-cheese-paratha.jpg' },
        { id: 20, name: 'Laccha Paratha',                      category: 'Ancient Flames',     price: 0,    image_path: '/menu/hot-tandoor/laccha-paratha.jpg' },
        { id: 21, name: 'Roti',                                category: 'Ancient Flames',     price: 40,   image_path: '/menu/hot-tandoor/roti.jpg' },

        // ── The Sizzling Grate ────────────────────────────────────
        { id: 22, name: 'Reshmi Kebab',                        category: 'The Sizzling Grate', price: 295, image_path: '/menu/sizzling-bbq/reshmi-kebab.jpg' },
        { id: 23, name: 'Chicken Tikka',                       category: 'The Sizzling Grate', price: 285, image_path: '/menu/sizzling-bbq/chicken-tikka.jpg' },
        { id: 24, name: 'Malai Boti',                          category: 'The Sizzling Grate', price: 350, image_path: '/menu/sizzling-bbq/malai-boti.jpg' },
        { id: 25, name: 'Chicken Tikka Boti',                  category: 'The Sizzling Grate', price: 330, image_path: '/menu/sizzling-bbq/chicken-tikka-boti.jpg' },

        // ── Liquid Alchemy ────────────────────────────────────────
        { id: 26, name: 'Chai',                                category: 'Liquid Alchemy',     price: 65,  image_path: '/menu/drinks/chai.jpg' },
        { id: 27, name: 'Lassi',                               category: 'Liquid Alchemy',     price: 110, image_path: '/menu/drinks/lassi.jpg' },
        { id: 28, name: 'Iced Tea',                            category: 'Liquid Alchemy',     price: 65,  image_path: '/menu/drinks/iced-tea.jpg' },
        { id: 29, name: 'Mint Margarita',                      category: 'Liquid Alchemy',     price: 75,  image_path: '/menu/drinks/mint-margarita.jpg' },
        { id: 30, name: 'Banana Milkshake',                    category: 'Liquid Alchemy',     price: 120, image_path: '/menu/drinks/banana-milkshake.jpg' },
        { id: 31, name: 'Season Special (Strawberry/Peach)',   category: 'Liquid Alchemy',     price: 125, image_path: '/menu/drinks/season-special.jpg' },

        // ── Brainy Bites ──────────────────────────────────────────
        { id: 32, name: 'Cinnamon Rolls',                      category: 'Brainy Bites', price: 330, image_path: '🥐' },
        { id: 33, name: 'Brownies',                            category: 'Brainy Bites', price: 330, image_path: '🍫' },
        { id: 34, name: 'Tom & Jerry Soufflé Cake',            category: 'Brainy Bites', price: 330, image_path: '🎂' },
        { id: 35, name: 'Carrot Cake',                         category: 'Brainy Bites', price: 330, image_path: '🥕' },

        // ── Shared Journeys (cheapest → most expensive) ───────────
        {
          id: 40, name: 'Laccha Burger Combo', category: 'Shared Journeys', price: 900,
          image_path: '/menu/deals/laccha-burger-combo.jpg',
          deal_items: [
            { qty: 2, name: 'Chicken Laccha Paratha Burger' },
            { qty: 1, name: 'Garlic Mayo Fries' },
            { qty: 2, name: 'Drinks (any)' },
            { qty: 2, name: 'Samosa' }
          ]
        },
        {
          id: 41, name: 'Mandi Fiesta', category: 'Shared Journeys', price: 1150,
          image_path: '/menu/deals/mandi-fiesta.jpg',
          deal_items: [
            { qty: 2, name: 'Chicken Mandi' },
            { qty: 2, name: 'Drinks (Chai / Mint Margarita / Iced Tea)' },
            { qty: 1, name: 'Pani Puri' }
          ]
        },
        {
          id: 42, name: 'Friends Combo', category: 'Shared Journeys', price: 1265,
          image_path: '/menu/deals/friends-combo.jpg',
          deal_items: [
            { qty: 1, name: 'Samosa' },
            { qty: 2, name: 'Biryani' },
            { qty: 1, name: 'Butter Chicken with Naan' },
            { qty: 1, name: 'Chai / Lassi' }
          ]
        },
        {
          id: 43, name: 'BBQ Platter', category: 'Shared Journeys', price: 1450,
          image_path: '/menu/deals/bbq-platter.jpg',
          deal_items: [
            { qty: 2, name: 'Reshmi Kebab' },
            { qty: 2, name: 'Chicken Tikka' },
            { qty: 6, name: 'Malai Boti' },
            { qty: 6, name: 'Chicken Tikka Boti' },
            { qty: 4, name: 'Paratha + Chutney' }
          ]
        }
      ]
      db.set('menu_items', items).write()
    }

    // ── Category rename migration ─────────────────────────────────
    const CATEGORY_RENAMES = {
      'Appetizers':  'Palate Teasers',
      'Main Course': 'Heart of the Feast',
      'Hot Tandoor': 'Ancient Flames',
      'Sizzling BBQ': 'The Sizzling Grate',
      'Drinks':      'Liquid Alchemy',
      'Deals':       'Shared Journeys',
    }
    const allItems = db.get('menu_items').value()
    let needsWrite = false
    const migrated = allItems.map((item) => {
      const newCat = CATEGORY_RENAMES[item.category]
      if (newCat) { needsWrite = true; return { ...item, category: newCat } }
      return item
    })
    if (needsWrite) db.set('menu_items', migrated).write()

    // ── Seed staff if table is empty ──────────────────────────────
    if (db.get('staff').value().length === 0) {
      // Edit names, roles, PINs, and shift times here before first launch.
      // PIN must be 4–8 digits. Set is_manager: true on at least one person.
      const hashPin = (pin) => createHash('sha256').update(String(pin)).digest('hex')
      const now = new Date().toISOString()

      const initialStaff = [
        {
          id: 1,
          name: 'Ahmed (Manager)',
          role: 'Manager',
          is_manager: true,
          phone_label: 'Ahmed iPhone',
          shift_start: '10:00',
          shift_end: '22:00',
          pin: '1234'
        },
        {
          id: 2,
          name: 'Ali',
          role: 'Waiter',
          is_manager: false,
          phone_label: 'Ali Samsung',
          shift_start: '10:00',
          shift_end: '18:00',
          pin: '2222'
        },
        {
          id: 3,
          name: 'Sara',
          role: 'Cashier',
          is_manager: false,
          phone_label: 'Sara iPhone',
          shift_start: '10:00',
          shift_end: '18:00',
          pin: '3333'
        },
        {
          id: 4,
          name: 'Umar',
          role: 'Waiter',
          is_manager: false,
          phone_label: 'Umar Phone',
          shift_start: '14:00',
          shift_end: '22:00',
          pin: '4444'
        },
        {
          id: 5,
          name: 'Fatima',
          role: 'Kitchen',
          is_manager: false,
          phone_label: 'Fatima Phone',
          shift_start: '10:00',
          shift_end: '18:00',
          pin: '5555'
        }
      ]

      const seeded = initialStaff.map(({ pin, ...rest }) => ({
        ...rest,
        active: true,
        pin_hash: hashPin(pin),
        enrolled_device_id: null,
        created_at: now,
        updated_at: now,
        last_check_in_at: null,
        last_check_out_at: null
      }))

      db.set('staff', seeded).write()
      db.set('_counters.staff', initialStaff.length).write()

      console.log('[DB] Seeded', initialStaff.length, 'staff members')
    }
  }
  return db
}

// Returns the local business-day date string (YYYY-MM-DD).
// The business day runs 10:00 AM → 2:00 AM, so anything before 2am
// still belongs to the previous calendar date.
function getBusinessDate() {
  const now = new Date()
  const d = now.getHours() < 2 ? new Date(now.getTime() - 86400000) : now
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

export { getDatabase, getBusinessDate }
