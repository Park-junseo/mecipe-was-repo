const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

// Prisma 파일을 dist로 복사
if (fs.existsSync('prisma/basic')) {
  const destDir = 'dist/prisma/basic';
  if (!fs.existsSync('dist/prisma')) {
    fs.mkdirSync('dist/prisma', { recursive: true });
  }
  copyRecursive('prisma/basic', destDir);
  console.log('✅ Prisma files copied to dist/prisma/basic');
} else {
  console.warn('⚠️ prisma/basic folder not found');
}

