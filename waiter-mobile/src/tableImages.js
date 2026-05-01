// Maps the first word of a table name to its bundled image.
// Matches the same prefix logic used in the POS desktop TableTile.
const tableImages = {
  'Lahori':      require('../assets/tables/Lahore.png'),
  'Karachi':     require('../assets/tables/Karachi.png'),
  'Islamabadi':  require('../assets/tables/Islamabad.png'),
  'Peshawari':   require('../assets/tables/Peshawar.png'),
  'Multani':     require('../assets/tables/multan.png'),
  'Faisalabadi': require('../assets/tables/Faislabad.png'),
  'Rawalpindi':  require('../assets/tables/Rawalpindi.png'),
  'Hyderabadi':  require('../assets/tables/Hyderabad.png'),
  'Quetta':      require('../assets/tables/Quetta.png'),
  'Gujrati':     require('../assets/tables/Gujrat.png'),
}

export function getTableImage(tableName) {
  if (!tableName) return null
  const prefix = tableName.split(' ')[0]
  return tableImages[prefix] || null
}
