import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { UploadCloud, FileSpreadsheet, Settings2, Download, Activity, Table as TableIcon, LayoutGrid, X, FileUp, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import './Dashboard.css';
import { API_BASE_URL } from '../config';

// Status colors inspired by the reference image
const STATUS_COLORS = {
  'Good': '#10b981', // emerald
  'Poor': '#eab308', // yellow
  'Very Poor': '#f97316', // orange
  'Zero': '#ef4444', // red
  'Default': ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#f472b6', '#a3e635']
};

const DATASET_CONFIGS = [
  { id: 'ticketAuto', label: 'Ticket Auto', color: '#38bdf8' },
  { id: 'ticketFna', label: 'Ticket FNA', color: '#818cf8' },
  { id: 'pmSite', label: 'Ticket PM Site', color: '#10b981' },
  { id: 'pmGenset', label: 'Ticket PM Genset', color: '#f59e0b' },
  { id: 'dataPic', label: 'Data PIC', color: '#c084fc' }
];

const getPreviewColumns = (configId, allColumns) => {
  if (configId === 'dataPic') {
    return ['PIC', 'NOP', 'Cluster', 'Role'];
  }
  if (configId === 'ticketFna') {
    return ['No Ticket', 'Site', 'Site name', 'Area name', 'Regional name', 'NOP name', 'Cluster name', 'Status'];
  }
  if (configId === 'ticketAuto') {
    return ['Ticket Number Inap', 'Ticket Number SWFM', 'Severity', 'Type Ticket', 'Site Id', 'Site Name', 'Site Class', 'Cluster TO', 'NOP'];
  }
  return allColumns.slice(0, 8);
};

const getCellValue = (row, colName, allColumns) => {
  if (row[colName] !== undefined) return row[colName];
  // Find a matching key in the actual columns
  const match = allColumns.find(c => c.toLowerCase().includes(colName.toLowerCase()));
  return match ? row[match] : '-';
};

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
  if (percent < 0.05) return null; // Hanya tampilkan jika > 5% agar tidak menumpuk
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#e2e8f0" fontSize={10} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {name.replace('Total Ticket ', '').replace('Total Tiket ', '')}
    </text>
  );
};

const ProductivityAchievement = () => {
  const [datasets, setDatasets] = useState({
    ticketAuto: { data: [], columns: [], fileName: '' },
    ticketFna: { data: [], columns: [], fileName: '' },
    pmSite: { data: [], columns: [], fileName: '' },
    pmGenset: { data: [], columns: [], fileName: '' },
    dataPic: { data: [], columns: [], fileName: '' },
    fmeLayout: { data: [], columns: [], fileName: '' }
  });

  const defaultLayout = ['top-kpis', 'donuts', 'productivity-table', 'pivot-table', 'raw-auto', 'raw-fna'];
  const [layoutOrder, setLayoutOrder] = useState(defaultLayout);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch initial data from server
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard-data`, { credentials: 'include' });
        if (res.ok) {
          const serverData = await res.json();
          setDatasets(prev => {
            const newDatasets = { ...prev };
            Object.keys(serverData).forEach(datasetId => {
              if (newDatasets[datasetId]) {
                newDatasets[datasetId] = {
                  data: serverData[datasetId].data,
                  columns: serverData[datasetId].columns,
                  fileName: serverData[datasetId].fileName
                };
              }
            });
            return newDatasets;
          });
        } else if (res.status === 401 || res.status === 403) {
          setError('Sesi login Anda telah habis. Silakan login ulang.');
        } else {
          setError(`Gagal mengambil data dari server (Error ${res.status}). Coba muat ulang halaman.`);
        }
      } catch (err) {
        console.error('Gagal mengambil data dashboard:', err);
        setError('Gagal terhubung ke server. Periksa koneksi internet Anda dan coba muat ulang halaman.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update layout from server data if available
  useEffect(() => {
    if (datasets.fmeLayout?.data && Array.isArray(datasets.fmeLayout.data) && datasets.fmeLayout.data.length > 0) {
      // Validate that it contains valid keys, or just use it directly
      setLayoutOrder(datasets.fmeLayout.data);
    }
  }, [datasets.fmeLayout]);

  // Dashboard FME Config State
  const [fmeConfig, setFmeConfig] = useState({
    timeCol: '',
    categoryCol: '',
    statusCol: '',
    metricCol: ''
  });

  // Cek role user secara aman untuk mencegah crash jika localStorage corrupt
  let isEmployee = false;
  try {
    const userString = localStorage.getItem('user');
    if (userString && userString !== 'undefined') {
      const user = JSON.parse(userString);
      isEmployee = user && user.role !== 'admin';
    }
  } catch (err) {
    console.error('Error parsing user data:', err);
  }

  // Filter State
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [rankFilter, setRankFilter] = useState('Semua');
  const [activeTab, setActiveTab] = useState(isEmployee ? 'dashboard_fme' : 'raw_data'); // Default to raw_data for admin, dashboard_fme for employee

  const dashboardRef = useRef(null);

  const processExcelData = async (binaryStr, datasetId, fileName) => {
    try {
      setLoading(true);
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length > 0) {
        const cols = Object.keys(jsonData[0]);
        
        // Save to backend
        const res = await fetch(`${API_BASE_URL}/dashboard-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            datasetId,
            fileName,
            data: jsonData,
            columns: cols
          })
        });

        if (res.ok) {
          setDatasets(prev => ({
            ...prev,
            [datasetId]: { data: jsonData, columns: cols, fileName }
          }));
          setError('');
        } else {
          setError(`Gagal menyimpan data ke server.`);
        }
      } else {
        setError(`File Excel kosong untuk ${datasetId}.`);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal membaca file Excel. Pastikan file tidak corrupt.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e, datasetId) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        processExcelData(evt.target.result, datasetId, file.name);
      };
      reader.readAsBinaryString(file);
    }
  };



  const handleMasterUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          setLoading(true);
          const workbook = XLSX.read(evt.target.result, { type: 'binary' });
          let successCount = 0;
          
          for (let i = 0; i < DATASET_CONFIGS.length; i++) {
            const config = DATASET_CONFIGS[i];
            const sheetName = workbook.SheetNames.find(n => n === config.label) || workbook.SheetNames[i];
            if (!sheetName) continue;
            
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            if (jsonData.length > 0) {
              const cols = Object.keys(jsonData[0]);
              
              const res = await fetch(`${API_BASE_URL}/dashboard-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  datasetId: config.id,
                  fileName: `${file.name} - ${sheetName}`,
                  data: jsonData,
                  columns: cols
                })
              });
              
              if (res.ok) {
                setDatasets(prev => ({
                  ...prev,
                  [config.id]: { data: jsonData, columns: cols, fileName: `${file.name} - ${sheetName}` }
                }));
                successCount++;
              }
            }
          }
          
          if (successCount === 0) {
            setError('Gagal membaca data dari template excel, pastikan tidak kosong.');
          } else {
            setError('');
            alert(`Berhasil mengupload ${successCount} sheet!`);
          }
        } catch (err) {
          console.error(err);
          setError('Gagal memproses master file.');
        } finally {
          setLoading(false);
          e.target.value = null; // reset input
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const removeDataset = async (datasetId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/dashboard-data/${datasetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDatasets(prev => ({
          ...prev,
          [datasetId]: { data: [], columns: [], fileName: '' }
        }));
      } else {
        setError(`Gagal menghapus data dari server.`);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const element = dashboardRef.current;
    if (!element) return;
    const opt = {
      margin:       0.2,
      filename:     `Dashboard_${new Date().toISOString().slice(0,10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 1.5, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'tabloid', orientation: 'landscape' }
    };
    element.classList.add('exporting-pdf');
    html2pdf().set(opt).from(element).save().then(() => element.classList.remove('exporting-pdf'));
  };

  // -----------------------------------------------------
  // DATA COMBINATIONS
  // -----------------------------------------------------
  const fmeData = useMemo(() => {
    // Build mapping dari NOP/PIC Name ke baris Data PIC
    const picMapping = {};
    const picDataRaw = datasets.dataPic?.data || [];
    const dataPicCols = datasets.dataPic?.columns || [];
    const picNopCol = dataPicCols.find(c => c.toLowerCase().trim() === 'nop') || 'NOP';
    const picNameCol = dataPicCols.find(c => c.toLowerCase().trim() === 'pic') || 'PIC';

    picDataRaw.forEach(picRow => {
      if (picRow[picNopCol]) picMapping[String(picRow[picNopCol]).trim().toLowerCase()] = picRow;
      if (picRow[picNameCol]) picMapping[String(picRow[picNameCol]).trim().toLowerCase()] = picRow;
    });

    const enrichRow = (row, nopColName, picTakeOverColName) => {
      let lookupVal = picTakeOverColName ? row[picTakeOverColName] : null;
      if (!lookupVal && nopColName) lookupVal = row[nopColName];
      const lookupKey = lookupVal ? String(lookupVal).trim().toLowerCase() : null;
      const picInfo = lookupKey && picMapping[lookupKey] ? picMapping[lookupKey] : {};
      
      // Filter out falsy/empty values from row so they don't overwrite valid picInfo data
      const cleanedRow = {};
      for (const [k, v] of Object.entries(row)) {
        if (v !== undefined && v !== null && v !== '') {
          cleanedRow[k] = v;
        }
      }
      return { ...picInfo, ...cleanedRow };
    };

    const autoCols = datasets.ticketAuto?.columns || [];
    const autoNopCol = autoCols.find(c => c.toLowerCase().trim() === 'nop');
    const autoPicTakeOverCol = autoCols.find(c => c.toLowerCase().trim().includes('pic take over'));

    return [
      ...(datasets.ticketAuto?.data || []).map(row => ({ ...enrichRow(row, autoNopCol, autoPicTakeOverCol), _source: 'ticketAuto' })), 
      ...(datasets.ticketFna?.data || []).map(row => ({ ...row, _source: 'ticketFna' })),
      ...(datasets.pmSite?.data || []).map(row => ({ ...row, _source: 'pmSite' })),
      ...(datasets.pmGenset?.data || []).map(row => ({ ...row, _source: 'pmGenset' })),
      ...(datasets.dataPic?.data || []).map(row => ({ ...row, _source: 'dataPic' }))
    ];
  }, [datasets.ticketAuto, datasets.ticketFna, datasets.pmSite, datasets.pmGenset, datasets.dataPic]);

  const fmeColumns = useMemo(() => {
    const cols = new Set([
      ...(datasets.ticketAuto?.columns || []), 
      ...(datasets.ticketFna?.columns || []),
      ...(datasets.pmSite?.columns || []),
      ...(datasets.pmGenset?.columns || []),
      ...(datasets.dataPic?.columns || [])
    ]);
    return Array.from(cols);
  }, [datasets.ticketAuto, datasets.ticketFna, datasets.pmSite, datasets.pmGenset, datasets.dataPic]);

  const pmData = useMemo(() => {
    return [...(datasets.pmSite?.data || []), ...(datasets.pmGenset?.data || [])];
  }, [datasets.pmSite, datasets.pmGenset]);

  // Determine which data is active based on tab
  const activeData = activeTab === 'dashboard_fme' ? fmeData : (activeTab === 'achievement_pm' ? pmData : fmeData);
  const activeColumns = activeTab === 'dashboard_fme' ? fmeColumns : (activeTab === 'achievement_pm' ? [] : fmeColumns); // Simplify for PM for now

  // Setup Initial Config for FME if data exists and config is empty
  useEffect(() => {
    if (fmeData.length > 0 && !fmeConfig.timeCol) {
      let suggestedTime = fmeColumns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('month') || c.toLowerCase().includes('waktu')) || fmeColumns[0];
      let suggestedCat = fmeColumns.find(c => c.toLowerCase().includes('region') || c.toLowerCase().includes('area') || c.toLowerCase().includes('role')) || fmeColumns[1];
      let suggestedStatus = fmeColumns.find(c => c.toLowerCase().includes('status') || c.toLowerCase().includes('flag') || c.toLowerCase().includes('prod')) || fmeColumns[2];
      let suggestedMetric = fmeColumns.find(c => typeof fmeData[0][c] === 'number') || '';

      setFmeConfig({
        timeCol: suggestedTime || fmeColumns[0] || '',
        categoryCol: suggestedCat || fmeColumns[0] || '',
        statusCol: suggestedStatus || fmeColumns[0] || '',
        metricCol: suggestedMetric
      });

      // Setup initial filters
      const allowedFilters = ['cluster to', 'sub cluster', 'nop', 'role', 'nama karyawan'];
      const newFilters = {};
      fmeColumns.forEach(col => {
        if (allowedFilters.includes(col.toLowerCase().trim())) {
          newFilters[col] = 'All';
        }
      });
      setFilters(newFilters);
    }
  }, [fmeData, fmeColumns, fmeConfig.timeCol]);

  // -----------------------------------------------------
  // FILTERING (Applies to active dashboard data)
  // -----------------------------------------------------
  const filteredData = useMemo(() => {
    // --- PRE-PROCESSING: Inject Role/Cluster/NOP from dataPic to other datasets ---
    const picDataRaw = activeData.filter(r => r._source === 'dataPic');
    const picNopCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'nop') || 'NOP';
    const picNameCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'pic') || 'PIC';
    
    const picLookup = {};
    const isValidKey = (k) => k && !['-', 'n/a', 'na', '#n/a', '0', 'null', 'undefined', ''].includes(k);
    picDataRaw.forEach(row => {
      const nop = row[picNopCol] ? String(row[picNopCol]).trim().toLowerCase() : null;
      const name = row[picNameCol] ? String(row[picNameCol]).trim().toLowerCase() : null;
      if (isValidKey(nop)) picLookup[nop] = row;
      if (isValidKey(name)) picLookup[name] = row;
    });

    const getDatasetCol = (source, searchStrs) => {
      const cols = datasets[source]?.columns || [];
      const lowerCols = cols.map(c => ({ original: c, lower: c.toLowerCase().trim() }));
      for (const s of searchStrs) {
        const match = lowerCols.find(c => c.lower === s);
        if (match) return match.original;
      }
      for (const s of searchStrs) {
        const regex = new RegExp(`\\b${s}\\b`);
        const match = lowerCols.find(c => regex.test(c.lower));
        if (match) return match.original;
      }
      for (const s of searchStrs) {
        const match = lowerCols.find(c => c.lower.includes(s));
        if (match) return match.original;
      }
      return null;
    };

    const colsMap = {
      ticketAuto: {
        nop: getDatasetCol('ticketAuto', ['nop']),
        pic: getDatasetCol('ticketAuto', ['pic take over ticket', 'pic take over', 'pic', 'nama karyawan'])
      },
      ticketFna: {
        nop: getDatasetCol('ticketFna', ['nop']),
        pic: getDatasetCol('ticketFna', ['pic take over ticket', 'pic take over', 'pic', 'nama karyawan'])
      },
      pmSite: {
        nop: getDatasetCol('pmSite', ['nop']),
        pic: getDatasetCol('pmSite', ['pic', 'nama karyawan', 'nama'])
      },
      pmGenset: {
        nop: getDatasetCol('pmGenset', ['nop']),
        pic: getDatasetCol('pmGenset', ['pic', 'nama karyawan', 'nama'])
      }
    };

    const enrichedData = activeData.map(row => {
      if (row._source === 'dataPic') return row;
      
      let picKey1 = null;
      let picKey2 = null;
      
      const sourceCols = colsMap[row._source];
      if (sourceCols) {
        const nopCol = sourceCols.nop;
        const picCol = sourceCols.pic;
        if (nopCol && row[nopCol] != null) picKey1 = String(row[nopCol]).trim().toLowerCase();
        if (picCol && row[picCol] != null) picKey2 = String(row[picCol]).trim().toLowerCase();
      }

      const matchedPic = picLookup[picKey1] || picLookup[picKey2];
      const newRow = { ...row };
      let enriched = false;

      if (matchedPic) {
        enriched = true;
        Object.keys(filters).forEach(filterKey => {
          const existingKey = Object.keys(row).find(k => k.toLowerCase().trim() === filterKey.toLowerCase().trim());
          if (!existingKey) {
            const matchedCol = Object.keys(matchedPic).find(k => k.toLowerCase().trim() === filterKey.toLowerCase().trim());
            if (matchedCol) {
              newRow[filterKey] = matchedPic[matchedCol]; // Inject missing filter column (e.g. Role)
            }
          }
        });
      }

      return enriched ? newRow : row;
    });

    return enrichedData.filter(row => {
      // 1. Slicers
      const allowedProductivitySlicers = ['role', 'cluster to', 'nop'];
      
      for (const [key, val] of Object.entries(filters)) {
        if (val !== 'All') {
          // Khusus tabel Productivity Team (ticketAuto, ticketFna, dataPic), abaikan slicer selain Role, Cluster TO, dan NOP agar tabel tetap sinkron
          if (['ticketAuto', 'ticketFna', 'dataPic'].includes(row._source)) {
            if (!allowedProductivitySlicers.includes(key.toLowerCase().trim())) {
              continue; 
            }
          }

          // Strict filtering untuk slicer yang berlaku
          const actualKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
          if (!actualKey || String(row[actualKey]).toLowerCase().trim() !== String(val).toLowerCase().trim()) {
            return false;
          }
        }
      }
      
      // 2. Date Range Filter
      if (dateRange.start || dateRange.end) {
        let rowDateStr = row[fmeConfig.timeCol];
        
        if (row._source === 'ticketAuto') {
          const autoCheckInCol = Object.keys(row).find(c => c.toLowerCase().trim() === 'check in at') || 'Check In At';
          rowDateStr = row[autoCheckInCol];
        } else if (row._source === 'ticketFna') {
          // Khusus FNA baca dari kolom 'Date' sesuai settingan
          const fnaTimeCol = Object.keys(row).find(c => c.toLowerCase().trim() === 'date') || 'Date';
          rowDateStr = row[fnaTimeCol];
        }

        if (rowDateStr) {
          let yyyy_mm_dd = null;
          if (!isNaN(rowDateStr) && Number(rowDateStr) > 10000) {
            // Excel Date -> Paksa ambil hari saja, konversi ke string YYYY-MM-DD agar kebal zona waktu
            const excelDays = Math.floor(Number(rowDateStr));
            const jsDate = new Date((excelDays - 25569) * 86400 * 1000);
            const yyyy = jsDate.getUTCFullYear();
            const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(jsDate.getUTCDate()).padStart(2, '0');
            yyyy_mm_dd = `${yyyy}-${mm}-${dd}`;
          } else {
            // String Date
            const dateStr = String(rowDateStr).split(' ')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              yyyy_mm_dd = dateStr;
            } else {
              const jsDate = new Date(dateStr);
              if (!isNaN(jsDate.getTime())) {
                const yyyy = jsDate.getFullYear();
                const mm = String(jsDate.getMonth() + 1).padStart(2, '0');
                const dd = String(jsDate.getDate()).padStart(2, '0');
                yyyy_mm_dd = `${yyyy}-${mm}-${dd}`;
              }
            }
          }
          
          if (yyyy_mm_dd) {
            if (dateRange.start && yyyy_mm_dd < dateRange.start) return false;
            if (dateRange.end && yyyy_mm_dd > dateRange.end) return false;
          }
        }
      }
      
      return true;
    });
  }, [activeData, filters, dateRange, fmeConfig.timeCol]);

  // Dynamic Extract Unique Values for Dropdowns
  const getUniqueValues = (col) => {
    const unique = new Set(activeData.map(row => String(row[col])));
    return Array.from(unique).filter(v => v !== 'undefined' && v !== 'null').sort();
  };

  // -----------------------------------------------------
  // FME DASHBOARD CHART AGGREGATIONS
  // -----------------------------------------------------
  const topKpis = useMemo(() => {
    let sum = 0;
    filteredData.forEach(row => {
      const val = Number(row[fmeConfig.metricCol]);
      if (!isNaN(val)) sum += val;
    });
    return {
      count: filteredData.length,
      sum: sum,
      avg: filteredData.length ? sum / filteredData.length : 0
    };
  }, [filteredData, fmeConfig.metricCol]);

  const donutData = useMemo(() => {
    const autoCount = filteredData.filter(r => r._source === 'ticketAuto').length;
    const fnaCount = filteredData.filter(r => r._source === 'ticketFna').length;

    return [
      { name: 'Total Tiket Auto', value: autoCount },
      { name: 'Total Ticket FNA', value: fnaCount }
    ].filter(item => item.value > 0);
  }, [filteredData]);
  const donutDataStatus = useMemo(() => {
    if (!fmeConfig.statusCol) return [];
    const grouped = {};
    filteredData.forEach(row => {
      const s = String(row[fmeConfig.statusCol]) || 'Unknown';
      grouped[s] = (grouped[s] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredData, fmeConfig.statusCol]);
  const trendData = useMemo(() => {
    if (!fmeConfig.timeCol) return { data: [], statuses: [] };
    const timeMap = {};
    const allStatuses = new Set();
    
    filteredData.forEach(row => {
      const t = String(row[fmeConfig.timeCol]) || 'Unknown';
      const s = String(row[fmeConfig.statusCol]) || 'Unknown';
      allStatuses.add(s);
      
      if (!timeMap[t]) timeMap[t] = { name: t, Total: 0 };
      timeMap[t][s] = (timeMap[t][s] || 0) + 1;
      timeMap[t].Total += 1;
    });
    
    const result = Object.values(timeMap).sort((a, b) => a.name.localeCompare(b.name));
    return { data: result, statuses: Array.from(allStatuses) };
  }, [filteredData, fmeConfig.timeCol, fmeConfig.statusCol]);

  const productivityTeamData = useMemo(() => {
    const isDateRangeActive = Boolean(dateRange.start || dateRange.end);
    const nopToPic = {};
    const picData = filteredData.filter(row => row._source === 'dataPic');
    const autoData = filteredData.filter(row => row._source === 'ticketAuto');
    
    // Find column names case-insensitively just in case
    const picNopCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'nop') || 'NOP';
    const picNameCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'pic') || 'PIC';

    const isValidKey = (k) => {
      if (!k) return false;
      const invalidKeys = ['-', 'n/a', 'na', '#n/a', '0', 'null', 'undefined', ''];
      return !invalidKeys.includes(k);
    };

    picData.forEach(row => {
      const picName = row[picNameCol] || 'Unknown';
      if (row[picNopCol]) {
        const key = String(row[picNopCol]).trim().toLowerCase();
        if (isValidKey(key)) nopToPic[key] = picName;
      }
      if (row[picNameCol]) {
        const key = String(row[picNameCol]).trim().toLowerCase();
        if (isValidKey(key)) nopToPic[key] = picName;
      }
    });

    const checkInSet = new Set();
    const groupedByPic = {};
    
    // Inisialisasi semua PIC yang lolos filter ke dalam tabel (walau tiketnya 0)
    Object.values(nopToPic).forEach(picName => {
      if (!groupedByPic[picName]) {
        groupedByPic[picName] = { name: picName, Total: 0 };
      }
    });
    
    // Find Ticket Auto columns
    // HANYA mencari kolom 'pic take over ticket' sesuai permintaan eksplisit
    const autoPicTakeOverCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim() === 'pic take over ticket');
    const autoNopCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim() === 'nop');
    const autoCheckInCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim() === 'check in at') || 'Check In At';
    const autoTicketCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim() === 'ticket number swfm') || 'Ticket Number SWFM';

    // Tahap 1: Ekstrak semua checkIn valid untuk menentukan maksimal 31 hari terakhir
    const parsedData = [];
    const allDates = new Set();
    
    autoData.forEach(row => {
      let checkInRaw = row[autoCheckInCol];
      // TIDAK ADA FALLBACK. Jika kolom 'Check In At' kosong, biarkan kosong!
      
      let checkIn = null;
      if (checkInRaw) {
        if (!isNaN(checkInRaw) && Number(checkInRaw) > 10000) {
          // Buang desimal (waktu) dari serial Excel agar murni jadi midnight UTC, mencegah timezone shift
          const excelDays = Math.floor(Number(checkInRaw));
          const jsDate = new Date((excelDays - 25569) * 86400 * 1000);
          const yyyy = jsDate.getUTCFullYear();
          const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(jsDate.getUTCDate()).padStart(2, '0');
          checkIn = `${yyyy}-${mm}-${dd}`;
        } else {
          const checkInStr = String(checkInRaw).split(' ')[0];
          // Jika string sudah rapi berformat YYYY-MM-DD, langsung gunakan
          if (/^\d{4}-\d{2}-\d{2}$/.test(checkInStr)) {
            checkIn = checkInStr;
          } else {
            const jsDate = new Date(checkInStr);
            if (!isNaN(jsDate.getTime())) {
              const yyyy = jsDate.getFullYear();
              const mm = String(jsDate.getMonth() + 1).padStart(2, '0');
              const dd = String(jsDate.getDate()).padStart(2, '0');
              checkIn = `${yyyy}-${mm}-${dd}`;
            } else {
              checkIn = checkInStr.replace(/\./g, '-');
            }
          }
        }
      }

      if (checkIn && /^\d{4}-\d{2}/.test(checkIn)) {
        allDates.add(checkIn);
      }
      
      parsedData.push({ row, checkIn });
    });

    // Jika Date Slicer tidak aktif, tampilkan HANYA rentang tanggal dalam SATU bulan yang sama (bulan paling baru)
    const validDatesArray = Array.from(allDates).sort();
    let allowedDates = new Set(validDatesArray);
    
    if (!isDateRangeActive && validDatesArray.length > 0) {
      const latestDateStr = validDatesArray[validDatesArray.length - 1]; // cth: '2026-08-05'
      const latestMonth = latestDateStr.substring(0, 7); // cth: '2026-08'
      
      const singleMonthDates = validDatesArray.filter(date => date.startsWith(latestMonth));
      allowedDates = new Set(singleMonthDates);
    }

    // Tahap 2: Hanya gunakan data yang valid (sesuai allowedDates)
    // Sort descending agar tiket yang muncul di beberapa hari dihitung di hari terakhirnya saja
    parsedData.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
    
    const globalTicketSet = new Set();

    parsedData.forEach(({ row, checkIn }) => {
      // Jika tidak memiliki tanggal valid, atau tidak masuk dalam rentang tanggal yg diizinkan, lewati
      if (!checkIn || !/^\d{4}-\d{2}/.test(checkIn) || !allowedDates.has(checkIn)) {
        return;
      }
      
      let pic = null;
      
      // 1. Coba cari berdasarkan PIC Take Over / Nama
      if (autoPicTakeOverCol && row[autoPicTakeOverCol]) {
        const key = String(row[autoPicTakeOverCol]).trim().toLowerCase();
        if (key) pic = nopToPic[key];
      }
      
      // 2. Jika masih tidak ada di Data PIC, abaikan
      if (!pic) {
        return; 
      }
      
      checkInSet.add(checkIn);

      // Simpan ticket ID ke dalam Set untuk menghindari duplikat dan baris kosong
      groupedByPic[pic][checkIn] = groupedByPic[pic][checkIn] || new Set();
      
      let ticketId = null;
      if (autoTicketCol) {
        // Jika kolom tiket ada, ambil nilainya
        ticketId = row[autoTicketCol] ? String(row[autoTicketCol]).trim() : null;
      } else {
        // Gunakan isi baris itu sendiri untuk mendeteksi baris duplikat.
        // Jika di Excel ada baris yang tersalin 50x, stringify-nya sama, sehingga hanya dihitung 1x.
        ticketId = JSON.stringify(row);
      }
      
      if (ticketId) {
        // Cegah penghitungan tiket yang sama lebih dari 1x meskipun muncul di banyak tanggal berbeda
        if (!globalTicketSet.has(ticketId)) {
          globalTicketSet.add(ticketId);
          groupedByPic[pic][checkIn].add(ticketId);
        }
      }
    });

    const finalData = Object.values(groupedByPic).map(picObj => {
      const finalObj = { name: picObj.name, Total: 0 };
      for (const col of checkInSet) {
        if (picObj[col]) {
          const count = picObj[col].size;
          if (count > 0) {
            finalObj[col] = count;
            finalObj.Total += count;
          }
        }
      }
      return finalObj;
    });

    let sortedData = finalData;
    if (rankFilter === 'Teratas') {
      sortedData = sortedData.sort((a,b) => b.Total - a.Total);
    } else if (rankFilter === 'Terbawah') {
      sortedData = sortedData.sort((a,b) => a.Total - b.Total);
    } else {
      sortedData = sortedData.sort((a,b) => a.name.localeCompare(b.name));
    }

    return {
      data: sortedData.slice(0, 50), // limit top 50 PICs
      fullData: sortedData,
      columns: Array.from(checkInSet).sort()
    };
  }, [filteredData, datasets.dataPic, dateRange, rankFilter]);

  const ticketFnaTeamData = useMemo(() => {
    const isDateRangeActive = Boolean(dateRange.start || dateRange.end);
    const nopToPic = {};
    const picData = filteredData.filter(row => row._source === 'dataPic');
    const fnaData = filteredData.filter(row => row._source === 'ticketFna');
    
    // Find column names case-insensitively just in case
    const picNopCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'nop') || 'NOP';
    const picNameCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'pic') || 'PIC';

    const isValidKey = (k) => {
      if (!k) return false;
      const invalidKeys = ['-', 'n/a', 'na', '#n/a', '0', 'null', 'undefined', ''];
      return !invalidKeys.includes(k);
    };

    picData.forEach(row => {
      const picName = row[picNameCol] || 'Unknown';
      if (row[picNopCol]) {
        const key = String(row[picNopCol]).trim().toLowerCase();
        if (isValidKey(key)) nopToPic[key] = picName;
      }
      if (row[picNameCol]) {
        const key = String(row[picNameCol]).trim().toLowerCase();
        if (isValidKey(key)) nopToPic[key] = picName;
      }
    });

    const checkInSet = new Set();
    const groupedByPic = {};
    
    // Inisialisasi semua PIC yang lolos filter ke dalam tabel (walau tiketnya 0)
    Object.values(nopToPic).forEach(picName => {
      if (!groupedByPic[picName]) {
        groupedByPic[picName] = { name: picName, Total: 0 };
      }
    });
    
    // Find Ticket FNA columns for PIC
    const fnaPicCol = (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim().includes('pic take over')) || (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim() === 'pic') || (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim().includes('nama karyawan'));
    const fnaNopCol = (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim() === 'nop');
    const fnaTicketCol = (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim() === 'no ticket') || (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim().includes('ticket'));
    
    // Eksklusif mencari kolom 'Date' sesuai permintaan
    const fnaTimeCol = (datasets.ticketFna?.columns || []).find(c => c.toLowerCase().trim() === 'date') || 'Date';

    // Tahap 1: Ekstrak semua checkIn valid untuk menentukan maksimal 31 hari terakhir
    const parsedData = [];
    const allDates = new Set();
    
    fnaData.forEach((row, rowIndex) => {
      let checkInRaw = row[fnaTimeCol];
      if (!checkInRaw) {
        // Fallback robust like ticket auto
        const fallback = Object.keys(row).find(k => k.toLowerCase().includes('waktu') || k.toLowerCase().includes('date') || k.toLowerCase().includes('check in'));
        if (fallback) checkInRaw = row[fallback];
      }
      
      let checkIn = null;
      if (checkInRaw) {
        if (!isNaN(checkInRaw) && Number(checkInRaw) > 10000) {
          const excelDays = Math.floor(Number(checkInRaw));
          const jsDate = new Date((excelDays - 25569) * 86400 * 1000);
          const yyyy = jsDate.getUTCFullYear();
          const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(jsDate.getUTCDate()).padStart(2, '0');
          checkIn = `${yyyy}-${mm}-${dd}`;
        } else {
          const checkInStr = String(checkInRaw).split(' ')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(checkInStr)) {
            checkIn = checkInStr;
          } else {
            const jsDate = new Date(checkInStr);
            if (!isNaN(jsDate.getTime())) {
              const yyyy = jsDate.getFullYear();
              const mm = String(jsDate.getMonth() + 1).padStart(2, '0');
              const dd = String(jsDate.getDate()).padStart(2, '0');
              checkIn = `${yyyy}-${mm}-${dd}`;
            } else {
              checkIn = checkInStr.replace(/\./g, '-');
            }
          }
        }
      }

      if (checkIn && /^\d{4}-\d{2}/.test(checkIn)) {
        allDates.add(checkIn);
      }
      
      parsedData.push({ row, checkIn });
    });

    const validDatesArray = Array.from(allDates).sort();
    let allowedDates = new Set(validDatesArray);
    
    if (!isDateRangeActive && validDatesArray.length > 0) {
      const latestDateStr = validDatesArray[validDatesArray.length - 1]; 
      const latestMonth = latestDateStr.substring(0, 7); 
      const singleMonthDates = validDatesArray.filter(date => date.startsWith(latestMonth));
      allowedDates = new Set(singleMonthDates);
    }

    // Tahap 2: Hanya gunakan data yang valid (sesuai allowedDates)
    // Sort descending agar tiket yang muncul di beberapa hari dihitung di hari terakhirnya saja
    parsedData.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));

    parsedData.forEach(({ row, checkIn }) => {
      // Jika tidak memiliki tanggal valid, atau tidak masuk dalam rentang tanggal yg diizinkan, lewati
      if (!checkIn || !/^\d{4}-\d{2}/.test(checkIn) || !allowedDates.has(checkIn)) {
        return;
      }
      
      let pic = null;
      
      // 1. Coba cari berdasarkan PIC Take Over / Nama
      if (fnaPicCol && row[fnaPicCol]) {
        const key = String(row[fnaPicCol]).trim().toLowerCase();
        if (key) pic = nopToPic[key];
      }
      
      // 2. Jika tidak ditemukan, coba gunakan NOP (Ticket FNA membutuhkan ini)
      if (!pic && fnaNopCol && row[fnaNopCol]) {
        const key = String(row[fnaNopCol]).trim().toLowerCase();
        if (key) pic = nopToPic[key];
      }
      
      // 3. Jika masih tidak ada di Data PIC, abaikan
      if (!pic) {
        return; 
      }
      
      checkInSet.add(checkIn);
      
      groupedByPic[pic][checkIn] = groupedByPic[pic][checkIn] || new Set();
      
      let ticketId = null;
      if (fnaTicketCol) {
        ticketId = row[fnaTicketCol] ? String(row[fnaTicketCol]).trim() : null;
      } else {
        // Jika tidak ada kolom tiket, gunakan isi baris untuk mencegah hitungan duplikat
        ticketId = JSON.stringify(row);
      }
      
      if (ticketId) {
        groupedByPic[pic][checkIn].add(ticketId);
      }
    });

    const finalData = Object.values(groupedByPic).map(picObj => {
      const finalObj = { name: picObj.name, Total: 0 };
      for (const col of checkInSet) {
        if (picObj[col]) {
          const count = picObj[col].size;
          if (count > 0) {
            finalObj[col] = count;
            finalObj.Total += count;
          }
        }
      }
      return finalObj;
    });

    let sortedData = finalData;
    if (rankFilter === 'Teratas') {
      sortedData = sortedData.sort((a,b) => b.Total - a.Total);
    } else if (rankFilter === 'Terbawah') {
      sortedData = sortedData.sort((a,b) => a.Total - b.Total);
    } else {
      sortedData = sortedData.sort((a,b) => a.name.localeCompare(b.name));
    }

    return {
      data: sortedData.slice(0, 50), 
      fullData: sortedData,
      columns: Array.from(checkInSet).sort()
    };
  }, [filteredData, datasets.dataPic, dateRange, fmeConfig.timeCol, rankFilter]);

  const combinedTicketTeamData = useMemo(() => {
    const autoData = productivityTeamData.fullData || [];
    const fnaData = ticketFnaTeamData.fullData || [];
    
    const picRoleCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'role') || 'Role';
    const picNopCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'nop') || 'NOP';
    const picClusterCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'cluster to' || c.toLowerCase().trim() === 'cluster') || 'Cluster TO';
    const picNameCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'pic' || c.toLowerCase().trim() === 'nama') || 'PIC';

    const picDetailsMap = {};
    if (datasets.dataPic?.data) {
      datasets.dataPic.data.forEach(row => {
        const name = row[picNameCol];
        if (name) {
          picDetailsMap[name] = {
            role: row[picRoleCol] || '-',
            nop: row[picNopCol] || '-',
            cluster: row[picClusterCol] || '-'
          };
        }
      });
    }
    
    const allCols = new Set([
      ...(productivityTeamData.columns || []),
      ...(ticketFnaTeamData.columns || [])
    ]);
    const columns = Array.from(allCols).sort();
    
    const grouped = {};
    const mergeData = (dataArray) => {
      dataArray.forEach(row => {
        if (!grouped[row.name]) {
          grouped[row.name] = { 
            name: row.name, 
            Total: 0,
            role: picDetailsMap[row.name]?.role || '-',
            nop: picDetailsMap[row.name]?.nop || '-',
            cluster: picDetailsMap[row.name]?.cluster || '-'
          };
        }
        columns.forEach(col => {
          if (row[col]) {
            grouped[row.name][col] = (grouped[row.name][col] || 0) + row[col];
          }
        });
        grouped[row.name].Total += (row.Total || 0);
      });
    };
    
    mergeData(autoData);
    mergeData(fnaData);
    
    let sortedData = Object.values(grouped);
    if (rankFilter === 'Teratas') {
      sortedData = sortedData.sort((a,b) => b.Total - a.Total);
    } else if (rankFilter === 'Terbawah') {
      sortedData = sortedData.sort((a,b) => a.Total - b.Total);
    } else {
      sortedData = sortedData.sort((a,b) => a.name.localeCompare(b.name));
    }
    
    return {
      data: sortedData.slice(0, 50),
      columns
    };
  }, [productivityTeamData, ticketFnaTeamData, rankFilter, datasets.dataPic]);

  const formatDateForDisplay = (dateStr) => {
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
      return `${jsDate.getDate()}/${jsDate.getMonth() + 1}`;
    }
    return dateStr;
  };

  const statusCards = useMemo(() => {
    if (!fmeConfig.statusCol || !fmeConfig.categoryCol) return [];
    const grouped = {};
    
    filteredData.forEach(row => {
      const s = String(row[fmeConfig.statusCol]) || 'Unknown';
      const c = String(row[fmeConfig.categoryCol]) || 'Unknown';
      if (!grouped[s]) grouped[s] = { status: s, total: 0, categories: {} };
      
      grouped[s].total += 1;
      grouped[s].categories[c] = (grouped[s].categories[c] || 0) + 1;
    });
    
    return Object.values(grouped).sort((a,b) => b.total - a.total);
  }, [filteredData, fmeConfig.statusCol, fmeConfig.categoryCol]);

  const customStatusCards = useMemo(() => {
    const buildCard = (datasetKey, title, groupCol) => {
      const datasetRows = filteredData.filter(row => row._source === datasetKey);
      
      if (datasetRows.length === 0) {
        return { status: title, total: 0, categories: {} };
      }
      
      const categories = {};
      datasetRows.forEach(row => {
        const actualKey = Object.keys(row).find(k => k.toLowerCase().trim() === groupCol.toLowerCase().trim());
        const val = actualKey && row[actualKey] ? String(row[actualKey]) : 'Unknown';
        categories[val] = (categories[val] || 0) + 1;
      });
      
      const sortedCategories = Object.fromEntries(
        Object.entries(categories).sort((a, b) => b[1] - a[1])
      );
      
      return { status: title, total: datasetRows.length, categories: sortedCategories };
    };

    return [
      buildCard('ticketAuto', 'Ticket Auto', 'Ticket SWFM Status'),
      buildCard('ticketFna', 'Ticket FNA', 'visit'),
      buildCard('pmSite', 'Ticket PM Site', 'Status'),
      buildCard('pmGenset', 'Ticket PM Genset', 'Status')
    ];
  }, [filteredData]);

  const getColorForStatus = (status, index) => {
    const s = status.toLowerCase();
    if (s.includes('good') || s.includes('baik') || s.includes('active')) return STATUS_COLORS['Good'];
    if (s.includes('very poor') || s.includes('sangat buruk')) return STATUS_COLORS['Very Poor'];
    if (s.includes('poor') || s.includes('buruk')) return STATUS_COLORS['Poor'];
    if (s.includes('zero') || s.includes('nol') || s.includes('inactive')) return STATUS_COLORS['Zero'];
    return STATUS_COLORS['Default'][index % STATUS_COLORS['Default'].length];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', zIndex: 1000 }}>
          <p style={{ color: '#e2e8f0', margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 600 }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.payload.fill, margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
              {entry.name}: {Number(entry.value).toLocaleString('id-ID')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const moveLayoutItem = (id, direction) => {
    const index = layoutOrder.indexOf(id);
    if (index === -1) return;
    const newLayout = [...layoutOrder];
    if (direction === 'up' && index > 0) {
      [newLayout[index - 1], newLayout[index]] = [newLayout[index], newLayout[index - 1]];
    } else if (direction === 'down' && index < newLayout.length - 1) {
      [newLayout[index + 1], newLayout[index]] = [newLayout[index], newLayout[index + 1]];
    }
    setLayoutOrder(newLayout);
  };

  const saveLayoutToBackend = async () => {
    setIsSavingLayout(true);
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: 'fmeLayout',
          fileName: 'layout_config',
          data: layoutOrder,
          columns: []
        }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Gagal menyimpan layout');
      alert('Susunan layout berhasil disimpan untuk semua perangkat!');
      setIsEditLayoutMode(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const renderLayoutWrapper = (id, children) => {
    const index = layoutOrder.indexOf(id);
    const displayIndex = index === -1 ? 99 : index; // if not in layoutOrder for some reason, put at end
    
    return (
      <div key={id} style={{ order: displayIndex, position: 'relative', border: isEditLayoutMode ? '2px dashed #38bdf8' : 'none', padding: isEditLayoutMode ? '1.5rem 0.5rem 0.5rem 0.5rem' : 0, borderRadius: '8px', backgroundColor: isEditLayoutMode ? 'rgba(56, 189, 248, 0.05)' : 'transparent', width: '100%' }}>
        {isEditLayoutMode && (
          <div style={{ position: 'absolute', top: '-12px', right: '10px', display: 'flex', gap: '0.5rem', zIndex: 50 }}>
            <button onClick={() => moveLayoutItem(id, 'up')} disabled={index === 0} style={{ padding: '4px 12px', background: index === 0 ? '#475569' : '#38bdf8', border: 'none', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: 'white', fontWeight: 'bold' }}>↑ Naik</button>
            <button onClick={() => moveLayoutItem(id, 'down')} disabled={index === layoutOrder.length - 1} style={{ padding: '4px 12px', background: index === layoutOrder.length - 1 ? '#475569' : '#38bdf8', border: 'none', borderRadius: '4px', cursor: index === layoutOrder.length - 1 ? 'not-allowed' : 'pointer', color: 'white', fontWeight: 'bold' }}>↓ Turun</button>
          </div>
        )}
        {children}
      </div>
    );
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflowY: 'auto', height: '100%', backgroundColor: '#0b1120', position: 'relative' }}>
      
      {loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 17, 32, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', backdropFilter: 'blur(4px)' }}>
          <Loader2 style={{ color: 'var(--primary-color)', animation: 'spin 1.5s linear infinite' }} size={48} />
          <p style={{ marginTop: '1rem', color: 'white', fontWeight: 600, fontSize: '1.125rem' }}>Memproses Data...</p>
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
          <Activity className="text-primary" /> Productivity & Analytics
        </h1>
        {activeTab === 'dashboard_fme' && fmeData.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!isEmployee && (
              <>
                <button onClick={() => setIsEditLayoutMode(!isEditLayoutMode)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.5)', background: isEditLayoutMode ? 'rgba(56, 189, 248, 0.2)' : 'transparent', color: '#38bdf8', cursor: 'pointer' }}>
                  <LayoutGrid size={16} /> {isEditLayoutMode ? 'Batal Edit Layout' : 'Ubah Posisi'}
                </button>
                {isEditLayoutMode && (
                  <button onClick={saveLayoutToBackend} disabled={isSavingLayout} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#0f172a', fontWeight: 600, cursor: isSavingLayout ? 'not-allowed' : 'pointer' }}>
                    {isSavingLayout ? <Loader2 size={16} className="spin" /> : <Settings2 size={16} />} Simpan Posisi
                  </button>
                )}
              </>
            )}
            <button onClick={handleExportPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--primary-color)', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}>
              <Download size={16} /> Export PDF
            </button>
          </div>
        )}
      </header>

      {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {!isEmployee && (
          <button onClick={() => setActiveTab('raw_data')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'raw_data' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === 'raw_data' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TableIcon size={16} /> RAW Data
          </button>
        )}
        <button onClick={() => setActiveTab('dashboard_fme')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'dashboard_fme' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === 'dashboard_fme' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutGrid size={16} /> Dashboard FME
        </button>
        <button onClick={() => setActiveTab('achievement_pm')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'achievement_pm' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === 'achievement_pm' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} /> Achievement PM
        </button>
      </div>

      {/* Slicers (Global Filters) - Only show if there is active data and we are in a dashboard view */}
      {activeData.length > 0 && activeTab !== 'raw_data' && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Slicers:</span>
          </div>
          {Object.keys(filters).map(filterKey => (
            <div key={filterKey} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>{filterKey}:</span>
              <select 
                value={filters[filterKey]} 
                onChange={(e) => setFilters({...filters, [filterKey]: e.target.value})}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="All">All</option>
                {getUniqueValues(filterKey).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Start Date:</span>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem', outline: 'none', fontWeight: 600, colorScheme: 'dark' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>End Date:</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem', outline: 'none', fontWeight: 600, colorScheme: 'dark' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Rank PIC:</span>
            <select 
              value={rankFilter} 
              onChange={(e) => setRankFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="Semua">Semua (A-Z)</option>
              <option value="Teratas">Teratas</option>
              <option value="Terbawah">Terbawah</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === 'raw_data' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
          
          {/* Master Template Controls */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.125rem' }}>Master Template Excel</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gunakan satu file Excel dengan 5 sheet untuk mengunggah semua data sekaligus.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>

              
              <input type="file" id="upload-master" accept=".xlsx, .xls" onChange={handleMasterUpload} style={{ display: 'none' }} />
              <label htmlFor="upload-master" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', margin: 0, border: '1px solid #34d399', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                <UploadCloud size={18} style={{ color: '#ffffff' }} /> <span style={{ color: '#ffffff' }}>Upload Data Excel</span>
              </label>
            </div>
          </div>

          {/* RAW DATA UPLOAD SECTIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingRight: '0.5rem' }}>
          {DATASET_CONFIGS.map(config => {
            const ds = datasets[config.id];
            const hasData = ds.data.length > 0;
            
            return (
              <div key={config.id} className="glass-panel animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderTop: `4px solid ${config.color}` }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet color={config.color} size={20}/> {config.label}
                  </h3>
                  {hasData && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                      {ds.data.length} baris
                    </span>
                  )}
                </div>
                
                <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                  {!hasData ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      <FileUp size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                      <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Upload file excel untuk tabel ini.</p>
                      <input type="file" id={`upload-${config.id}`} accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, config.id)} style={{ display: 'none' }} />
                      <label htmlFor={`upload-${config.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: config.color, color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                        Pilih File Excel
                      </label>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{ds.fileName}</span>
                        <button onClick={() => removeDataset(config.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <X size={14}/> Hapus & Re-upload
                        </button>
                      </div>
                      <div style={{ overflow: 'auto', flex: 1, maxHeight: '250px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#e2e8f0', fontSize: '0.75rem' }}>
                          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0 }}>
                            <tr>
                              {getPreviewColumns(config.id, ds.columns).map(col => (
                                <th key={col} style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ds.data.slice(0, 10).map((row, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                {getPreviewColumns(config.id, ds.columns).map(col => (
                                  <td key={`${i}-${col}`} style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {['dataPic', 'ticketFna', 'ticketAuto'].includes(config.id) ? getCellValue(row, col, ds.columns) : row[col]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Menampilkan 10 baris pertama sebagai *preview*.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : activeTab === 'dashboard_fme' ? (
        fmeData.length > 0 ? (
          <div ref={dashboardRef} className="export-container animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0b1120', padding: '0.5rem' }}>
            
            {/* Top KPIs */}
            {renderLayoutWrapper('top-kpis',
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Records</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white' }}>{topKpis.count.toLocaleString('id-ID')}</span>
                </div>
                {fmeConfig.metricCol && (
                  <>
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total {fmeConfig.metricCol}</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>{topKpis.sum.toLocaleString('id-ID', {maximumFractionDigits:2})}</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg {fmeConfig.metricCol}</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-color)' }}>{topKpis.avg.toLocaleString('id-ID', {maximumFractionDigits:2})}</span>
                    </div>
                  </>
                )}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Unique {fmeConfig.categoryCol}</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399' }}>{getUniqueValues(fmeConfig.categoryCol).length}</span>
                </div>
              </div>
            )}

            {/* Middle Section: 2 Donut Charts */}
            {renderLayoutWrapper('donuts',
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {/* Donut Chart 1: Total Ticket */}
                <div className="glass-panel" style={{ padding: '1rem', height: '300px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'white', textAlign: 'center' }}>Total Ticket</h3>
                  <div style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={donutData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={45} 
                          outerRadius={70} 
                          paddingAngle={2} 
                          dataKey="value" 
                          nameKey="name" 
                          label={renderCustomLabel}
                          labelLine={false}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColorForStatus(entry.name, index)} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem' }} formatter={(value) => value.replace('Total Ticket ', '').replace('Total Tiket ', '').replace('Total ', '')} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart 2: Proporsi Status */}
                <div className="glass-panel" style={{ padding: '1rem', height: '300px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'white', textAlign: 'center' }}>Proporsi Status</h3>
                  <div style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={donutDataStatus} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={45} 
                          outerRadius={70} 
                          paddingAngle={2} 
                          dataKey="value" 
                          nameKey="name" 
                          label={renderCustomLabel}
                          labelLine={false}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {donutDataStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColorForStatus(entry.name, index)} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem' }} formatter={(value) => value.replace('Total Ticket ', '').replace('Total Tiket ', '').replace('Total ', '')} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Section: Area Chart & Status Breakdown Cards */}
            {renderLayoutWrapper('productivity-table',
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Status Breakdown Cards - Horizontal di atas tabel */}
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch' }} className="custom-scrollbar">
                  {customStatusCards.map((card, index) => {
                    const color = getColorForStatus(card.status, index);
                    return (
                      <div key={card.status} style={{ backgroundColor: color, borderRadius: '8px', padding: '0.75rem 1rem', color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '220px', flex: '1 0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{card.total}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right', lineHeight: 1.1 }}>{card.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                          {Object.entries(card.categories).map(([cat, count]) => (
                            <div key={cat} style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ opacity: 0.9, fontWeight: 600 }}>{cat}</span>
                              <span style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: '0.1rem' }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Container for Productivity Table and Summary Team */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                  {/* Productivity Table */}
                  <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 600px' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Productivity</h3>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, maxHeight: '480px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', WebkitOverflowScrolling: 'touch' }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: 'white', fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nama</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Role</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>NOP</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Cluster TO</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Ticket Auto + FNA</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedTicketTeamData.data.map((row, idx) => {
                          const rowBg = idx % 2 === 0 ? '#0f172a' : '#162032';
                          const totalHari = combinedTicketTeamData.columns.length;
                          const target = totalHari * 2.5;
                          const isGood = row.Total >= target;
                          const statusText = isGood ? 'Good' : 'Poor';
                          const statusColor = isGood ? '#10b981' : '#ef4444';
                          return (
                            <tr key={idx} style={{ backgroundColor: rowBg }}>
                              <td style={{ padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>{row.name}</td>
                              <td style={{ padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>{row.role}</td>
                              <td style={{ padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>{row.nop}</td>
                              <td style={{ padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>{row.cluster}</td>
                              <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold', color: '#38bdf8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.Total}</td>
                              <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: statusColor, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ backgroundColor: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>{statusText}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Team Panel */}
                {(() => {
                  const totalPIC = combinedTicketTeamData.data.length;
                  const summary = {
                    TS: { total: 0, good: 0, poor: 0 },
                    MBP: { total: 0, good: 0, poor: 0 },
                    PM: { total: 0, good: 0, poor: 0 },
                  };
                  const target = combinedTicketTeamData.columns.length * 2.5;

                  combinedTicketTeamData.data.forEach(row => {
                    const isGood = row.Total >= target;
                    let r = (row.role || '').toUpperCase();
                    let k = null;
                    if (r.includes('TS')) k = 'TS';
                    else if (r.includes('MBP')) k = 'MBP';
                    else if (r.includes('PM')) k = 'PM';

                    if (k) {
                      summary[k].total++;
                      if (isGood) summary[k].good++;
                      else summary[k].poor++;
                    }
                  });

                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: '1 1 450px', minWidth: '350px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>Summary Team</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', flex: 1 }}>
                        {/* Column 1: Total PIC */}
                        <div style={{ backgroundColor: '#3b82f6', borderRadius: '8px', padding: '0.5rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Team</span>
                              <i className="fas fa-users" style={{ fontSize: '1.25rem', opacity: 0.9 }}></i>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, marginTop: '0.5rem', lineHeight: 1 }}>{totalPIC}</div>
                          </div>
                          
                          <div style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-around' }}>
                            {['TS', 'MBP', 'PM'].map(role => (
                              <div key={role} style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>{role}</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{summary[role]?.total || 0}</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Total Team</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 2: Good Prod */}
                        <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '0.5rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Good Prod</span>
                              <i className="fas fa-check" style={{ fontSize: '1.25rem', opacity: 0.9 }}></i>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, marginTop: '0.5rem', lineHeight: 1 }}>{summary.MBP.good + summary.PM.good + summary.TS.good}</div>
                          </div>
                          
                          <div style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-around' }}>
                            {['TS', 'MBP', 'PM'].map(role => (
                              <div key={role} style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>{role}</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{summary[role]?.good || 0}</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Good Prod</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 3: Poor Prod */}
                        <div style={{ backgroundColor: '#eab308', borderRadius: '8px', padding: '0.5rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Poor Prod</span>
                              <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.25rem', opacity: 0.9 }}></i>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, marginTop: '0.5rem', lineHeight: 1 }}>{summary.MBP.poor + summary.PM.poor + summary.TS.poor}</div>
                          </div>
                          
                          <div style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-around' }}>
                            {['TS', 'MBP', 'PM'].map(role => (
                              <div key={role} style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>{role}</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{summary[role]?.poor || 0}</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Poor Prod</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              </div>
            )}
                       {/* Combined Ticket Auto + FNA Pivot Table */}
            {renderLayoutWrapper('pivot-table',
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Ticket Auto + FNA</h3>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '480px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', WebkitOverflowScrolling: 'touch', position: 'relative' }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: 'white', fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 10, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', minWidth: '100px', maxWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.5)' }}>PIC</th>
                          {combinedTicketTeamData.columns.map(col => (
                            <th key={col} style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.3rem', textAlign: 'center', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', minWidth: '40px' }}>{formatDateForDisplay(col)}</th>
                          ))}
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedTicketTeamData.data.map((row, idx) => {
                          const rowBg = idx % 2 === 0 ? '#0f172a' : '#162032';
                          return (
                            <tr key={idx} style={{ backgroundColor: rowBg }}>
                              <td style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: rowBg, padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.5)' }} title={row.name}>{row.name}</td>
                              {combinedTicketTeamData.columns.map(col => (
                                <td key={col} style={{ padding: '0.3rem 0.3rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: row[col] ? '#38bdf8' : 'rgba(255,255,255,0.1)' }}>{row[col] || 0}</td>
                              ))}
                              <td style={{ backgroundColor: rowBg, padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.1)', color: '#10b981' }}>{row.Total}</td>
                            </tr>
                          );
                        })}
                        {combinedTicketTeamData.data.length > 0 && (
                          <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                            <td style={{ position: 'sticky', bottom: 0, left: 0, zIndex: 10, backgroundColor: '#1e293b', padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '2px -2px 5px -2px rgba(0,0,0,0.5)' }}>Grand Total</td>
                            {combinedTicketTeamData.columns.map(col => {
                              const colTotal = combinedTicketTeamData.data.reduce((sum, row) => sum + (row[col] || 0), 0);
                              return <td key={col} style={{ position: 'sticky', bottom: 0, zIndex: 5, backgroundColor: '#1e293b', padding: '0.3rem 0.3rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>{colTotal || 0}</td>;
                            })}
                            <td style={{ position: 'sticky', bottom: 0, zIndex: 5, backgroundColor: '#1e293b', padding: '0.3rem 0.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                              {combinedTicketTeamData.data.reduce((sum, row) => sum + row.Total, 0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Productivity Team Pivot Table */}
            {renderLayoutWrapper('raw-auto',
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Ticket Auto</h3>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '480px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', WebkitOverflowScrolling: 'touch', position: 'relative' }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: 'white', fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 10, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', minWidth: '100px', maxWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.5)' }}>PIC</th>
                          {productivityTeamData.columns.map(col => (
                            <th key={col} style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.3rem', textAlign: 'center', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', minWidth: '40px' }}>{formatDateForDisplay(col)}</th>
                          ))}
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productivityTeamData.data.map((row, idx) => {
                          const rowBg = idx % 2 === 0 ? '#0f172a' : '#162032';
                          return (
                            <tr key={idx} style={{ backgroundColor: rowBg }}>
                              <td style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: rowBg, padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.5)' }} title={row.name}>{row.name}</td>
                              {productivityTeamData.columns.map(col => (
                                <td key={col} style={{ padding: '0.3rem 0.3rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: row[col] ? '#38bdf8' : 'rgba(255,255,255,0.1)' }}>{row[col] || 0}</td>
                              ))}
                              <td style={{ backgroundColor: rowBg, padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.1)', color: '#10b981' }}>{row.Total}</td>
                            </tr>
                          );
                        })}
                        {productivityTeamData.data.length > 0 && (
                          <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                            <td style={{ position: 'sticky', bottom: 0, left: 0, zIndex: 10, backgroundColor: '#1e293b', padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '2px -2px 5px -2px rgba(0,0,0,0.5)' }}>Grand Total</td>
                            {productivityTeamData.columns.map(col => {
                              const colTotal = productivityTeamData.data.reduce((sum, row) => sum + (row[col] || 0), 0);
                              return <td key={col} style={{ position: 'sticky', bottom: 0, zIndex: 5, backgroundColor: '#1e293b', padding: '0.3rem 0.3rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>{colTotal || 0}</td>;
                            })}
                            <td style={{ position: 'sticky', bottom: 0, zIndex: 5, backgroundColor: '#1e293b', padding: '0.3rem 0.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                              {productivityTeamData.data.reduce((sum, row) => sum + row.Total, 0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ticket FNA Pivot Table */}
            {renderLayoutWrapper('raw-fna',
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Ticket FNA</h3>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '480px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', WebkitOverflowScrolling: 'touch', position: 'relative' }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: 'white', fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 10, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'left', minWidth: '100px', maxWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.5)' }}>PIC</th>
                          {ticketFnaTeamData.columns.map(col => (
                            <th key={col} style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.3rem', textAlign: 'center', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', minWidth: '40px' }}>{formatDateForDisplay(col)}</th>
                          ))}
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#0f172a', padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketFnaTeamData.data.map((row, idx) => {
                          const rowBg = idx % 2 === 0 ? '#0f172a' : '#162032';
                          return (
                            <tr key={idx} style={{ backgroundColor: rowBg }}>
                              <td style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: rowBg, padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.5)' }} title={row.name}>{row.name}</td>
                              {ticketFnaTeamData.columns.map(col => (
                                <td key={col} style={{ padding: '0.3rem 0.3rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: row[col] ? '#38bdf8' : 'rgba(255,255,255,0.1)' }}>{row[col] || 0}</td>
                              ))}
                              <td style={{ backgroundColor: rowBg, padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.1)', color: '#10b981' }}>{row.Total}</td>
                            </tr>
                          );
                        })}
                        {ticketFnaTeamData.data.length > 0 && (
                          <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                            <td style={{ position: 'sticky', bottom: 0, left: 0, zIndex: 10, backgroundColor: '#1e293b', padding: '0.3rem 0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '2px -2px 5px -2px rgba(0,0,0,0.5)' }}>Grand Total</td>
                            {ticketFnaTeamData.columns.map(col => {
                              const colTotal = ticketFnaTeamData.data.reduce((sum, row) => sum + (row[col] || 0), 0);
                              return <td key={col} style={{ position: 'sticky', bottom: 0, zIndex: 5, backgroundColor: '#1e293b', padding: '0.3rem 0.3rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>{colTotal || 0}</td>;
                            })}
                            <td style={{ position: 'sticky', bottom: 0, zIndex: 5, backgroundColor: '#1e293b', padding: '0.3rem 0.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                              {ticketFnaTeamData.data.reduce((sum, row) => sum + row.Total, 0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


          </div>
        ) : (
          <div className="glass-panel animate-fade-in-up" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <LayoutGrid size={40} className="text-primary" />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>Dashboard Kosong</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
              Harap upload minimal satu file data (Ticket Auto, Ticket FNA, Ticket PM Site, atau Ticket PM Genset) di tab RAW Data untuk melihat visualisasi.
            </p>
          </div>
        )
      ) : (
        /* ACHIEVEMENT PM SKELETON */
        <div className="glass-panel animate-fade-in-up" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Activity size={40} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>Dashboard Achievement PM</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1rem auto' }}>
            Halaman visualisasi khusus untuk performa Preventive Maintenance (PM) sedang dalam tahap pengembangan. 
          </p>
          {pmData.length > 0 ? (
            <p style={{ color: '#10b981', fontWeight: 600 }}>✅ Terdapat {pmData.length} baris data PM yang siap diolah.</p>
          ) : (
             <p style={{ color: '#ef4444', fontWeight: 600 }}>❌ Belum ada data PM. Upload "Ticket PM Site" atau "Ticket PM Genset" di tab RAW Data.</p>
          )}
        </div>
      )}
    </div>
  );
};

class ProductivityErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ProductivityAchievement Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', backgroundColor: '#0b1120', height: '100%', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ padding: '2rem', border: '1px solid #ef4444' }}>
            <h2 style={{ color: '#ef4444', marginTop: 0 }}>Aplikasi Mengalami Error (Crash)</h2>
            <p>Maaf, ada masalah saat menampilkan Dashboard. Sistem gagal memproses salah satu data kolom dari file Excel.</p>
            <p style={{ fontWeight: 'bold' }}>Pesan Error Teknis (Kirimkan ini ke tim IT):</p>
            <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', color: '#fca5a5', overflowX: 'auto', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            <button onClick={() => window.location.reload()} className="btn btn-outline" style={{ marginTop: '1.5rem', borderColor: '#ef4444', color: '#fca5a5' }}>
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SafeProductivityAchievement = (props) => (
  <ProductivityErrorBoundary>
    <ProductivityAchievement {...props} />
  </ProductivityErrorBoundary>
);

export default SafeProductivityAchievement;
