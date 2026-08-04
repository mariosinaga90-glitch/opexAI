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
    dataPic: { data: [], columns: [], fileName: '' }
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch initial data from server
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard-data`);
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
        }
      } catch (err) {
        console.error('Gagal mengambil data dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  // Dashboard FME Config State
  const [fmeConfig, setFmeConfig] = useState({
    timeCol: '',
    categoryCol: '',
    statusCol: '',
    metricCol: ''
  });

  // Filter State
  const [filters, setFilters] = useState({});
  const [activeTab, setActiveTab] = useState('raw_data'); // Default to raw_data initially so they see the upload boxes
  const [showConfig, setShowConfig] = useState(true);

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
    return [
      ...datasets.ticketAuto.data, 
      ...datasets.ticketFna.data,
      ...datasets.pmSite.data,
      ...datasets.pmGenset.data,
      ...datasets.dataPic.data
    ];
  }, [datasets.ticketAuto.data, datasets.ticketFna.data, datasets.pmSite.data, datasets.pmGenset.data, datasets.dataPic.data]);

  const fmeColumns = useMemo(() => {
    const cols = new Set([
      ...datasets.ticketAuto.columns, 
      ...datasets.ticketFna.columns,
      ...datasets.pmSite.columns,
      ...datasets.pmGenset.columns,
      ...datasets.dataPic.columns
    ]);
    return Array.from(cols);
  }, [datasets.ticketAuto.columns, datasets.ticketFna.columns, datasets.pmSite.columns, datasets.pmGenset.columns, datasets.dataPic.columns]);

  const pmData = useMemo(() => {
    return [...datasets.pmSite.data, ...datasets.pmGenset.data];
  }, [datasets.pmSite.data, datasets.pmGenset.data]);

  // Determine which data is active based on tab
  const activeData = activeTab === 'dashboard_fme' ? fmeData : (activeTab === 'achievement_pm' ? pmData : fmeData);
  const activeColumns = activeTab === 'dashboard_fme' ? fmeColumns : (activeTab === 'achievement_pm' ? [] : fmeColumns); // Simplify for PM for now

  // Setup Initial Config for FME if data exists and config is empty
  useMemo(() => {
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
      const allowedFilters = ['severity', 'site class', 'cluster to', 'sub cluster', 'nop', 'sla status', 'role', 'nama karyawan', 'pic take over ticket'];
      const newFilters = {};
      fmeColumns.forEach(col => {
        if (allowedFilters.includes(col.toLowerCase().trim())) {
          newFilters[col] = 'All';
        }
      });
      setFilters(newFilters);
      setShowConfig(false);
    }
  }, [fmeData, fmeColumns, fmeConfig.timeCol]);

  // -----------------------------------------------------
  // FILTERING (Applies to active dashboard data)
  // -----------------------------------------------------
  const filteredData = useMemo(() => {
    return activeData.filter(row => {
      for (const [key, val] of Object.entries(filters)) {
        if (val !== 'All' && String(row[key]) !== String(val)) {
          return false;
        }
      }
      return true;
    });
  }, [activeData, filters]);

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
    const applyFilters = (dataArray) => {
      return dataArray.filter(row => {
        for (const [key, val] of Object.entries(filters)) {
          if (val !== 'All' && String(row[key]) !== String(val)) {
            return false;
          }
        }
        return true;
      });
    };

    const autoCount = applyFilters(datasets.ticketAuto.data).length;
    const fnaCount = applyFilters(datasets.ticketFna.data).length;
    const siteCount = applyFilters(datasets.pmSite.data).length;
    const gensetCount = applyFilters(datasets.pmGenset.data).length;
    const picCount = applyFilters(datasets.dataPic.data).length;

    return [
      { name: 'Total Tiket Auto', value: autoCount },
      { name: 'Total Ticket FNA', value: fnaCount }
    ].filter(item => item.value > 0);
  }, [datasets, filters]);
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
    if (!fmeConfig.timeCol) return [];
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
    const nopToPic = {};
    const picData = datasets.dataPic?.data || [];
    const autoData = datasets.ticketAuto?.data || [];
    
    // Find column names case-insensitively just in case
    const picNopCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'nop') || 'NOP';
    const picNameCol = (datasets.dataPic?.columns || []).find(c => c.toLowerCase().trim() === 'pic') || 'PIC';

    picData.forEach(row => {
      const picName = row[picNameCol] || 'Unknown';
      if (row[picNopCol]) {
        nopToPic[String(row[picNopCol]).trim().toLowerCase()] = picName;
      }
      if (row[picNameCol]) {
        // Juga map nama ke nama itu sendiri (berjaga-jaga jika Ticket Auto isinya langsung nama)
        nopToPic[String(row[picNameCol]).trim().toLowerCase()] = picName;
      }
    });

    const checkInSet = new Set();
    const groupedByPic = {};
    
    // Find Ticket Auto columns
    const autoPicTakeOverCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim().includes('pic take over'));
    const autoNopCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim() === 'nop');
    const autoCheckInCol = (datasets.ticketAuto?.columns || []).find(c => c.toLowerCase().trim() === 'check in at') || 'Check In At';

    autoData.forEach(row => {
      let checkInRaw = row[autoCheckInCol];
      if (!checkInRaw) {
        // Fallback search
        const fallbackCheckIn = Object.keys(row).find(k => k.toLowerCase().includes('check in'));
        if (fallbackCheckIn) checkInRaw = row[fallbackCheckIn];
      }
      
      let checkIn = 'No Check In';
      if (checkInRaw) {
        if (!isNaN(checkInRaw) && Number(checkInRaw) > 10000) {
          const jsDate = new Date((Number(checkInRaw) - 25569) * 86400 * 1000);
          const yyyy = jsDate.getFullYear();
          const mm = String(jsDate.getMonth() + 1).padStart(2, '0');
          const dd = String(jsDate.getDate()).padStart(2, '0');
          checkIn = `${yyyy}-${mm}-${dd}`;
        } else {
          const checkInStr = String(checkInRaw).split(' ')[0];
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
      
      // Coba ambil dari PIC Take Over, jika tidak ada/kosong, fallback ke NOP
      let lookupVal = autoPicTakeOverCol ? row[autoPicTakeOverCol] : null;
      if (!lookupVal && autoNopCol) {
        lookupVal = row[autoNopCol];
      }
      
      const lookupKey = lookupVal ? String(lookupVal).trim().toLowerCase() : null;
      // Jika pic tidak ditemukan di mapping Data PIC, abaikan/hilangkan data ini
      if (!lookupKey || !nopToPic[lookupKey]) {
        return; // skip forEach iteration
      }
      
      const pic = nopToPic[lookupKey];

      checkInSet.add(checkIn);

      if (!groupedByPic[pic]) {
        groupedByPic[pic] = { name: pic, Total: 0 };
      }
      groupedByPic[pic][checkIn] = (groupedByPic[pic][checkIn] || 0) + 1;
      groupedByPic[pic].Total += 1;
    });

    return {
      data: Object.values(groupedByPic).sort((a,b) => b.Total - a.Total).slice(0, 50), // limit top 50 PICs to prevent overwhelming chart
      columns: Array.from(checkInSet).sort()
    };
  }, [datasets.ticketAuto, datasets.dataPic]);

  const formatDateForDisplay = (dateStr) => {
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowConfig(!showConfig)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: showConfig ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', cursor: 'pointer' }}>
              <Settings2 size={16} /> Konfigurasi FME
            </button>
            <button onClick={handleExportPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--primary-color)', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}>
              <Download size={16} /> Export PDF
            </button>
          </div>
        )}
      </header>

      {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => setActiveTab('raw_data')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'raw_data' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === 'raw_data' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TableIcon size={16} /> RAW Data
        </button>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingRight: '0.5rem' }}>
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
            
            {/* Configuration Panel */}
            {showConfig && (
              <div className="glass-panel animate-fade-in-down" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '0.875rem' }}>MAPPING KOLOM (Penting untuk visualisasi)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sumbu Waktu (Time/Date)</label>
                    <select value={fmeConfig.timeCol} onChange={(e) => setFmeConfig({...fmeConfig, timeCol: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {fmeColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Kategori Utama (Role/Region)</label>
                    <select value={fmeConfig.categoryCol} onChange={(e) => setFmeConfig({...fmeConfig, categoryCol: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {fmeColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status (Kondisi/Warna)</label>
                    <select value={fmeConfig.statusCol} onChange={(e) => setFmeConfig({...fmeConfig, statusCol: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {fmeColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Metrik (Angka / Opsional)</label>
                    <select value={fmeConfig.metricCol} onChange={(e) => setFmeConfig({...fmeConfig, metricCol: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <option value="">-- Hanya Hitung Baris --</option>
                      {fmeColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Top KPIs */}
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

            {/* Middle Section: 2 Donut Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

            {/* Stacked Bar Chart for Trends */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', height: '350px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Trend {fmeConfig.statusCol} per {fmeConfig.timeCol}</h3>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData.data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      {trendData.statuses.map((status, index) => (
                        <Bar key={status} dataKey={status} stackId="a" fill={getColorForStatus(status, index)} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Bottom Section: Area Chart & Status Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              
              {/* Line/Area Chart */}
              <div className="glass-panel" style={{ padding: '1rem', height: '300px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Pergerakan Total per {fmeConfig.timeCol}</h3>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Total" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown Cards (Colored like reference) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', overflowY: 'auto', maxHeight: '300px', paddingRight: '0.5rem' }}>
                {statusCards.map((card, index) => {
                  const color = getColorForStatus(card.status, index);
                  return (
                    <div key={card.status} style={{ backgroundColor: color, borderRadius: '8px', padding: '1rem', color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{card.total}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>{card.status}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                        {Object.entries(card.categories).map(([cat, count]) => (
                          <div key={cat} style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ opacity: 0.9 }}>{cat}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Productivity Team Pivot Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white' }}>Productivity Team (Pivot Table)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>PIC</th>
                        {productivityTeamData.columns.map(col => (
                          <th key={col} style={{ padding: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateForDisplay(col)}</th>
                        ))}
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productivityTeamData.data.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem' }}>{row.name}</td>
                          {productivityTeamData.columns.map(col => (
                            <td key={col} style={{ padding: '0.75rem', textAlign: 'center' }}>{row[col] || 0}</td>
                          ))}
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{row.Total}</td>
                        </tr>
                      ))}
                      {productivityTeamData.data.length > 0 && (
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 'bold', borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                          <td style={{ padding: '0.75rem' }}>Grand Total</td>
                          {productivityTeamData.columns.map(col => {
                            const colTotal = productivityTeamData.data.reduce((sum, row) => sum + (row[col] || 0), 0);
                            return <td key={col} style={{ padding: '0.75rem', textAlign: 'center' }}>{colTotal}</td>;
                          })}
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {productivityTeamData.data.reduce((sum, row) => sum + row.Total, 0)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

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

export default ProductivityAchievement;
