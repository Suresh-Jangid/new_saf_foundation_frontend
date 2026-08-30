#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove console.log, console.error, console.warn statements
    content = content.replace(/console\.(log|error|warn|info|debug)\s*\([^)]*\)\s*;?/g, '');
    
    // Remove empty lines that might be left behind
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      processDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js'))) {
      removeConsoleLogs(fullPath);
    }
  }
}

// Process the app directory
const appDir = path.join(__dirname, '..', 'app');
const componentsDir = path.join(__dirname, '..', 'components');
const libDir = path.join(__dirname, '..', 'lib');

if (fs.existsSync(appDir)) processDirectory(appDir);
if (fs.existsSync(componentsDir)) processDirectory(componentsDir);
if (fs.existsSync(libDir)) processDirectory(libDir);

console.log('Console log removal completed!');
