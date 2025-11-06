const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const http = require('http');

const scenariosDir = path.join(__dirname, '..', 'scenarios');
const envPath = path.join(__dirname, '..', '.env');

// .env 파일에서 API_KEY 읽기
function loadApiKey() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env 파일이 존재하지 않습니다.');
    console.error('   load-tests 폴더에 .env 파일을 생성하고 API_KEY를 설정해주세요.');
    console.error('   예시: API_KEY=your_artillery_cloud_api_key');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const apiKeyMatch = envContent.match(/API_KEY\s*=\s*(.+)/);
  
  if (!apiKeyMatch) {
    console.error('❌ .env 파일에 API_KEY가 설정되어 있지 않습니다.');
    console.error('   .env 파일에 다음을 추가해주세요:');
    console.error('   API_KEY=your_artillery_cloud_api_key');
    process.exit(1);
  }

  const apiKey = apiKeyMatch[1].trim().replace(/^["']|["']$/g, '');
  
  if (!apiKey || apiKey === 'your_artillery_cloud_api_key') {
    console.error('❌ API_KEY가 올바르게 설정되지 않았습니다.');
    console.error('   .env 파일에서 API_KEY를 확인해주세요.');
    process.exit(1);
  }

  return apiKey;
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

// Artillery Cloud 실행
async function runArtilleryCloud(scenarioFile, apiKey) {
  const scenarioPath = path.join(scenariosDir, scenarioFile);

  // 시나리오 파일에서 target URL 읽기
  const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
  const targetMatch = scenarioContent.match(/target:\s*["']([^"']+)["']/);
  const targetUrl = targetMatch ? targetMatch[1] : 'http://localhost:4000';

  console.log(`\n☁️  Artillery Cloud에 기록 중...`);
  console.log(`   시나리오: ${scenarioFile}`);
  console.log(`   대상 서버: ${targetUrl}`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...\n`);

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

  // spawn을 사용하여 실시간 출력 확인
  const artilleryProcess = spawn(
    'npx',
    ['artillery', 'run', normalizedScenarioPath, '--record', '--key', apiKey],
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true, // Windows에서 shell 사용
    }
  );

  artilleryProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ Artillery Cloud에 성공적으로 기록되었습니다!`);
      console.log(`   결과는 Artillery Cloud 대시보드에서 확인할 수 있습니다.`);
      console.log(`   https://app.artillery.io`);
    } else {
      console.error(`\n❌ Artillery Cloud 기록 중 오류가 발생했습니다. (종료 코드: ${code})`);
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
  try {
    const apiKey = loadApiKey();
    const scenarios = findScenarioFiles();
    const selectedScenario = await selectScenario(scenarios);
    await runArtilleryCloud(selectedScenario, apiKey);
  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    process.exit(1);
  }
}

main();

