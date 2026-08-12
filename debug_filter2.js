const filters = { 'Cluster TO': 'JABODETABEK' };
const fmeColumns = ['NOP', 'Cluster TO', 'Role', 'Nama Karyawan', 'Sub Cluster'];

const allowedFilters = ['cluster to', 'sub cluster', 'nop', 'role', 'nama karyawan'];
const activeData = [
  { _source: 'dataPic', NOP: '123', 'Cluster TO': 'JABODETABEK', Role: 'PM', 'Nama Karyawan': 'Agus' },
  { _source: 'ticketAuto', NOP: '123', 'PIC Take Over': 'Agus', 'Cluster TO': 'JABODETABEK', Role: 'PM' } // Injected by enrichRow
];

const getUniqueValues = (col) => {
  const unique = new Set();
  activeData.forEach(row => {
    const actualKey = Object.keys(row).find(k => k.toLowerCase().trim() === col.toLowerCase().trim());
    if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null && String(row[actualKey]).trim() !== '') {
      unique.add(String(row[actualKey]).trim());
    }
  });
  return Array.from(unique).filter(v => v !== 'undefined' && v !== 'null').sort();
};

console.log('Options for Cluster TO:', getUniqueValues('Cluster TO'));

const filteredData = activeData.filter(row => {
  for (const [key, val] of Object.entries(filters)) {
    if (val !== 'All') {
      const actualKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
      if (!actualKey || String(row[actualKey]).toLowerCase().trim() !== String(val).toLowerCase().trim()) {
        console.log('Failed filtering for', row._source, 'reason:', !actualKey ? 'Key not found' : 'Value mismatch', 'key:', key, 'actualKey:', actualKey, 'val:', val, 'row[actualKey]:', actualKey ? row[actualKey] : null);
        return false;
      }
    }
  }
  return true;
});

console.log('Filtered Data:', filteredData.map(d => d._source));
