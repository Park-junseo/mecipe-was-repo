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

if (require.main === module) {
  const distFolder = process.argv[2];
  if (!distFolder) {
    console.error('⚠️ dist folder is required');
    process.exit(1);
  }
  // Prisma 파일을 dist로 복사
  // 스크립트는 mecipe-was 디렉토리에서 실행되므로, 상대 경로를 조정
  const prismaSource = path.join(__dirname, '../../prisma/basic');
  const destDir = path.join(__dirname, '../../../dist',distFolder, 'prisma/basic');

  if (fs.existsSync(prismaSource)) {
    const destParent = path.dirname(destDir);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }
    copyRecursive(prismaSource, destDir);
    console.log('✅ Prisma files copied to:', destDir);
  } else {
    console.warn('⚠️ prisma/basic folder not found at:', prismaSource);
  }

}

