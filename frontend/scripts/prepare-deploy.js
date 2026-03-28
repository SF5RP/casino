const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'dist', 'casino-frontend');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function resetDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

ensureExists(standaloneDir, 'Next standalone output');
ensureExists(staticDir, 'Next static output');

resetDir(outputDir);
copyDir(standaloneDir, outputDir);

const targetStaticDir = path.join(outputDir, '.next', 'static');
fs.mkdirSync(path.dirname(targetStaticDir), { recursive: true });
copyDir(staticDir, targetStaticDir);

if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(outputDir, 'public'));
}

console.log(`Frontend deploy bundle prepared in ${outputDir}`);
