#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Bundle analysis script
function analyzeBundle() {
  const buildDir = path.join(process.cwd(), '.next');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Build directory not found. Please run "npm run build" first.');
    return;
  }

  console.log('🔍 Analyzing bundle size...\n');

  // Analyze static files
  const staticDir = path.join(buildDir, 'static');
  if (fs.existsSync(staticDir)) {
    analyzeDirectory(staticDir, 'Static Assets');
  }

  // Analyze server files
  const serverDir = path.join(buildDir, 'server');
  if (fs.existsSync(serverDir)) {
    analyzeDirectory(serverDir, 'Server Files');
  }

  // Check for large files
  checkLargeFiles(buildDir);
}

function analyzeDirectory(dir, name) {
  console.log(`📁 ${name}:`);
  
  const files = getAllFiles(dir);
  const totalSize = files.reduce((sum, file) => {
    const stats = fs.statSync(file);
    return sum + stats.size;
  }, 0);

  console.log(`   Total size: ${formatBytes(totalSize)}`);
  console.log(`   File count: ${files.length}`);

  // Show largest files
  const fileSizes = files.map(file => ({
    path: path.relative(process.cwd(), file),
    size: fs.statSync(file).size
  })).sort((a, b) => b.size - a.size);

  console.log('   Largest files:');
  fileSizes.slice(0, 5).forEach(file => {
    console.log(`     ${file.path}: ${formatBytes(file.size)}`);
  });

  console.log('');
}

function getAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  });
  
  return files;
}

function checkLargeFiles(dir) {
  console.log('⚠️  Large files (>1MB):');
  
  const files = getAllFiles(dir);
  const largeFiles = files.filter(file => {
    const stats = fs.statSync(file);
    return stats.size > 1024 * 1024; // 1MB
  });

  if (largeFiles.length === 0) {
    console.log('   No large files found ✅');
  } else {
    largeFiles.forEach(file => {
      const stats = fs.statSync(file);
      console.log(`   ${path.relative(process.cwd(), file)}: ${formatBytes(stats.size)}`);
    });
  }

  console.log('');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Performance recommendations
function showRecommendations() {
  console.log('💡 Performance Recommendations:');
  console.log('');
  console.log('1. 📦 Bundle Optimization:');
  console.log('   - Use dynamic imports for large components');
  console.log('   - Implement code splitting for routes');
  console.log('   - Remove unused dependencies');
  console.log('');
  console.log('2. 🖼️  Image Optimization:');
  console.log('   - Use Next.js Image component');
  console.log('   - Implement WebP/AVIF formats');
  console.log('   - Add proper image sizing');
  console.log('');
  console.log('3. 🚀 Runtime Performance:');
  console.log('   - Use React.memo for expensive components');
  console.log('   - Implement virtual scrolling for large lists');
  console.log('   - Add loading states and skeleton screens');
  console.log('');
  console.log('4. 🌐 Network Optimization:');
  console.log('   - Enable gzip compression');
  console.log('   - Implement service worker caching');
  console.log('   - Use CDN for static assets');
  console.log('');
}

// Run analysis
analyzeBundle();
showRecommendations();
