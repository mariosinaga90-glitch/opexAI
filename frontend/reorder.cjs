const fs = require('fs');

const file = 'src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const trendStart = content.indexOf('      {/* Trend Chart Full Width */}');
const gridStart = content.indexOf('      <div style={{ display: \'grid\', gridTemplateColumns: \'2fr 1fr\', gap: \'1.5rem\', alignItems: \'start\', animationDelay: \'0.2s\' }} className="animate-fade-in-up">');
const pendingStart = content.indexOf('        {/* Pending Requests Table */}');
const chartsStart = content.indexOf('      {/* Charts Column */}');
const endGrid = content.indexOf('      </div> {/* End Grid */}');

if (trendStart > -1 && gridStart > -1 && pendingStart > -1 && chartsStart > -1 && endGrid > -1) {
  const statsPart = content.slice(0, trendStart);
  const trendPart = content.slice(trendStart, gridStart);
  
  // Pending table
  let pendingPart = content.slice(pendingStart, chartsStart);
  // remove leading spaces for formatting
  pendingPart = pendingPart.split('\n').map(l => l.replace(/^  /, '')).join('\n');
  pendingPart = pendingPart.replace('<div className="data-section glass-panel">', '<div className="data-section glass-panel animate-fade-in-up" style={{ animationDelay: \'0.3s\' }}>');

  // Charts
  let chartsPart = content.slice(chartsStart, endGrid);
  chartsPart = chartsPart.split('\n').map(l => l.replace(/^  /, '')).join('\n');
  chartsPart = chartsPart.replace(
    '<div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1.5rem\' }}>',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(auto-fit, minmax(300px, 1fr))\', gap: \'1.5rem\', marginBottom: \'1.5rem\' }} className="animate-fade-in-up">'
  );

  const endPart = content.slice(endGrid + 29); // skip '      </div> {/* End Grid */}\n'

  const newContent = statsPart + chartsPart + trendPart + pendingPart + endPart;
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Reordered successfully!');
} else {
  console.log('Could not find all sections', {trendStart, gridStart, pendingStart, chartsStart, endGrid});
}
