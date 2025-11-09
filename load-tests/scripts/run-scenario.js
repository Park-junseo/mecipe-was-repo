const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const http = require('http');

const scenariosDir = path.join(__dirname, '..', 'scenarios');
const reportsDir = path.join(__dirname, '..', 'reports');

// reports 폴더가 없으면 생성
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// scenarios 폴더에서 yml 파일 찾기
function findScenarioFiles() {
  if (!fs.existsSync(scenariosDir)) {
    console.error('❌ scenarios 폴더가 존재하지 않습니다.');
    process.exit(1);
  }

  const files = fs.readdirSync(scenariosDir);
  const ymlFiles = files.filter(
    (file) => file.endsWith('.yml') || file.endsWith('.yaml')
  );

  if (ymlFiles.length === 0) {
    console.error('❌ scenarios 폴더에 yml 파일이 없습니다.');
    process.exit(1);
  }

  return ymlFiles.sort();
}

// 날짜 형식 생성 (YYYY-MM-DD)
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}

// 시나리오 이름에서 확장자 제거
function getScenarioName(filename) {
  return filename.replace(/\.(yml|yaml)$/, '');
}

// 사용자에게 시나리오 선택 요청
function selectScenario(scenarios) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n📋 사용 가능한 시나리오:');
    scenarios.forEach((scenario, index) => {
      console.log(`  ${index + 1}. ${scenario}`);
    });

    rl.question('\n시나리오 번호를 선택하세요: ', (answer) => {
      rl.close();
      const index = parseInt(answer, 10) - 1;

      if (isNaN(index) || index < 0 || index >= scenarios.length) {
        console.error('❌ 잘못된 번호입니다.');
        process.exit(1);
      }

      resolve(scenarios[index]);
    });
  });
}

// 서버 연결 확인
function checkServerConnection(targetUrl) {
  return new Promise((resolve) => {
    const url = new URL(targetUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/hello',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Artillery 실행
async function runArtillery(scenarioFile) {
  const scenarioPath = path.join(scenariosDir, scenarioFile);
  const scenarioName = getScenarioName(scenarioFile);
  const dateString = getDateString();
  const outputFile = path.join(
    reportsDir,
    `${scenarioName}-${dateString}.json`
  );

  // 시나리오 파일에서 target URL 읽기
  const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
  const targetMatch = scenarioContent.match(/target:\s*["']([^"']+)["']/);
  const targetUrl = targetMatch ? targetMatch[1] : 'http://localhost:4000';

  console.log(`\n🚀 Artillery 부하 테스트 시작...`);
  console.log(`   시나리오: ${scenarioFile}`);
  console.log(`   대상 서버: ${targetUrl}`);
  console.log(`   결과 파일: ${path.basename(outputFile)}\n`);

  // 서버 연결 확인
  console.log('🔍 서버 연결 확인 중...');
  const isServerAvailable = await checkServerConnection(targetUrl);
  if (!isServerAvailable) {
    console.error(`\n❌ 서버에 연결할 수 없습니다: ${targetUrl}`);
    console.error('   서버가 실행 중인지 확인해주세요.');
    process.exit(1);
  }
  console.log('✅ 서버 연결 확인 완료\n');

  // Windows에서 경로 문제 해결
  const normalizedScenarioPath = scenarioPath.replace(/\\/g, '/');
  const normalizedOutputFile = outputFile.replace(/\\/g, '/');

  // spawn을 사용하여 실시간 출력 확인
  const artilleryProcess = spawn('npx', ['artillery', 'run', normalizedScenarioPath, '--output', normalizedOutputFile], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: true, // Windows에서 shell 사용
  });

  artilleryProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ 테스트 완료! 결과가 저장되었습니다: ${outputFile}`);
    } else {
      console.error(`\n❌ Artillery가 종료 코드 ${code}로 종료되었습니다.`);
      process.exit(code);
    }
  });

  artilleryProcess.on('error', (error) => {
    console.error('\n❌ Artillery 실행 중 오류가 발생했습니다:', error.message);
    console.error('   Artillery가 설치되어 있는지 확인해주세요: npm install');
    process.exit(1);
  });
}

// 메인 실행
async function main() {
  const scenarios = findScenarioFiles();
  const selectedScenario = await selectScenario(scenarios);
  runArtillery(selectedScenario);
}

main();

