const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('c:/Users/LOQ/opexAI/frontend/src/pages');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // First we replace "Mikro Cluster" to "Cluster" and "Cluster / Mikro" to "NOP / Cluster" to avoid conflicts
  content = content.replace(/>Mikro Cluster</g, '>Cluster<');
  content = content.replace(/>Cluster \/ Mikro</g, '>NOP / Cluster<');
  
  // Now we replace exact label instances of "Cluster"
  content = content.replace(/>Cluster</g, '>NOP<');
  content = content.replace(/>TO Cluster</g, '>TO NOP<');
  content = content.replace(/'TO Cluster'/g, "'TO NOP'");
  content = content.replace(/"TO Cluster"/g, '"TO NOP"');
  content = content.replace(/Semua TO Cluster/g, 'Semua TO NOP');
  content = content.replace(/Semua Cluster/g, 'Semua NOP');
  content = content.replace(/Pilih TO Cluster/g, 'Pilih TO NOP');
  
  // This is for table headers and values in objects like { header: 'Cluster', key: 'cluster' }
  content = content.replace(/'Cluster'/g, "'NOP'");
  content = content.replace(/"Cluster"/g, '"NOP"');

  // We should make sure we don't accidentally replace the value 'Cluster' we just put for 'Mikro Cluster'.
  // However, `>Mikro Cluster<` became `>Cluster<`. And then our next replace `>Cluster<` to `>NOP<` will overwrite it!!
  // So the order or approach is wrong.

  // Let's do it right:
  // We can use temporary strings.
  // Mikro Cluster -> __TMP_CLUSTER__
  // Cluster -> NOP
  // __TMP_CLUSTER__ -> Cluster

  let content2 = fs.readFileSync(file, 'utf8');
  let newContent = content2;

  newContent = newContent.replace(/Mikro Cluster/g, '__TMP_CLUSTER__');
  newContent = newContent.replace(/Cluster \/ Mikro/g, '__TMP_MIX__');
  
  newContent = newContent.replace(/>Cluster</g, '>NOP<');
  newContent = newContent.replace(/>TO Cluster</g, '>TO NOP<');
  newContent = newContent.replace(/'TO Cluster'/g, "'TO NOP'");
  newContent = newContent.replace(/"TO Cluster"/g, '"TO NOP"');
  newContent = newContent.replace(/Semua TO Cluster/g, 'Semua TO NOP');
  newContent = newContent.replace(/Semua Cluster/g, 'Semua NOP');
  newContent = newContent.replace(/Pilih TO Cluster/g, 'Pilih TO NOP');
  
  // Specific headers
  newContent = newContent.replace(/'Cluster'/g, "'NOP'");
  newContent = newContent.replace(/"Cluster"/g, '"NOP"');

  // Revert temp variables
  newContent = newContent.replace(/__TMP_CLUSTER__/g, 'Cluster');
  newContent = newContent.replace(/__TMP_MIX__/g, 'NOP / Cluster');

  if (newContent !== content2) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated', file);
  }
});
