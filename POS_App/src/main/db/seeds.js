const seedData = (db) => {
  // Seed 10 tables
  const tableCount = db.prepare('SELECT COUNT(*) as count FROM tables').get()
  if (tableCount.count === 0) {
    const insertTable = db.prepare('INSERT INTO tables (name, status) VALUES (?, ?)')
    for (let i = 1; i <= 10; i++) {
      insertTable.run(`Table ${i}`, 'empty')
    }
  }

  // Seed menu items across 3 categories
  const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get()
  if (menuCount.count === 0) {
    const insertItem = db.prepare(
      'INSERT INTO menu_items (name, category, price, image_path) VALUES (?, ?, ?, ?)'
    )
    const items = [
      // Starters
      ['Garlic Bread', 'Starters', 4.99, '🥖'],
      ['Bruschetta', 'Starters', 6.99, '🍅'],
      ['Chicken Wings', 'Starters', 8.99, '🍗'],
      ['Mozzarella Sticks', 'Starters', 7.49, '🧀'],
      ['Caesar Salad', 'Starters', 9.99, '🥗'],
      // Mains
      ['Grilled Chicken', 'Mains', 14.99, '🍗'],
      ['Beef Burger', 'Mains', 12.99, '🍔'],
      ['Margherita Pizza', 'Mains', 13.99, '🍕'],
      ['Pasta Carbonara', 'Mains', 11.99, '🍝'],
      ['Grilled Salmon', 'Mains', 17.99, '🐟'],
      ['Veggie Wrap', 'Mains', 10.99, '🌯'],
      // Drinks
      ['Coca-Cola', 'Drinks', 2.99, '🥤'],
      ['Lemonade', 'Drinks', 3.49, '🍋'],
      ['Iced Tea', 'Drinks', 2.99, '🧊'],
      ['Orange Juice', 'Drinks', 3.99, '🍊']
    ]
    for (const item of items) {
      insertItem.run(...item)
    }
  }

  // Seed default printer settings
  const printerMock = db
    .prepare("SELECT value FROM settings WHERE key = 'printer_mock'")
    .get()
  if (!printerMock) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    insertSetting.run('printer_mock', 'true')
    insertSetting.run('printer_type', 'network')
    insertSetting.run('printer_interface', '192.168.1.100:9100')
  }
}

export default seedData
