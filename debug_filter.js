const filters = { 'Role': 'PM', 'Cluster TO': 'All' };
const row = { _source: 'ticketAuto', 'PIC Take Over': 'John Doe' };
const matchedPic = { 'Role': 'PM', 'Cluster TO': 'Bali' };

const newRow = { ...row };
let enriched = false;
if (matchedPic) {
  enriched = true;
  Object.keys(filters).forEach(filterKey => {
    const matchedCol = Object.keys(matchedPic).find(k => k.toLowerCase().trim() === filterKey.toLowerCase().trim());
    if (matchedCol) {
      newRow[filterKey] = matchedPic[matchedCol];
    }
  });
}
console.log('Enriched:', newRow);

const allowedProductivitySlicers = ['role', 'cluster to', 'nop'];
let isMatch = true;

for (const [key, val] of Object.entries(filters)) {
  if (val !== 'All') {
    if (['ticketAuto', 'ticketFna', 'dataPic'].includes(newRow._source)) {
      if (!allowedProductivitySlicers.includes(key.toLowerCase().trim())) {
        continue; 
      }
    }

    const actualKey = Object.keys(newRow).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
    if (!actualKey || String(newRow[actualKey]).toLowerCase().trim() !== String(val).toLowerCase().trim()) {
      console.log('Failed on key:', key, 'actualKey:', actualKey, 'val:', val, 'rowVal:', actualKey ? newRow[actualKey] : null);
      isMatch = false;
      break;
    }
  }
}
console.log('isMatch:', isMatch);
