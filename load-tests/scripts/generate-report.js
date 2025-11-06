const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const reportsDir = path.join(__dirname, '..', 'reports');

// reports 폴더가 없으면 생성
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// reports 폴더에서 JSON 파일 찾기
function findReportFiles() {
  if (!fs.existsSync(reportsDir)) {
    console.error('❌ reports 폴더가 존재하지 않습니다.');
    process.exit(1);
  }

  const files = fs.readdirSync(reportsDir);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.error('❌ reports 폴더에 JSON 파일이 없습니다.');
    console.error('   먼저 부하 테스트를 실행해주세요: npm run artillery');
    process.exit(1);
  }

  // 최신 파일이 먼저 오도록 정렬 (날짜 기준)
  return jsonFiles.sort((a, b) => {
    const statA = fs.statSync(path.join(reportsDir, a));
    const statB = fs.statSync(path.join(reportsDir, b));
    return statB.mtime - statA.mtime;
  });
}

// 파일 정보 표시 (날짜, 크기 등)
function getFileInfo(filename) {
  const filePath = path.join(reportsDir, filename);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const date = stats.mtime.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { sizeKB, date };
}

// 사용자에게 리포트 파일 선택 요청
function selectReportFile(reportFiles) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n📊 사용 가능한 부하 테스트 결과:');
    reportFiles.forEach((file, index) => {
      const info = getFileInfo(file);
      console.log(`  ${index + 1}. ${file}`);
      console.log(`     생성일: ${info.date} | 크기: ${info.sizeKB} KB`);
    });

    rl.question('\n리포트 번호를 선택하세요: ', (answer) => {
      rl.close();
      const index = parseInt(answer, 10) - 1;

      if (isNaN(index) || index < 0 || index >= reportFiles.length) {
        console.error('❌ 잘못된 번호입니다.');
        process.exit(1);
      }

      resolve(reportFiles[index]);
    });
  });
}

// HTML 리포트 생성
function generateHtmlReport(jsonFile) {
  const jsonPath = path.join(reportsDir, jsonFile);
  const htmlFileName = jsonFile.replace(/\.json$/, '.html');
  const htmlPath = path.join(reportsDir, htmlFileName);

  console.log(`\n📈 HTML 리포트 생성 중...`);
  console.log(`   입력 파일: ${jsonFile}`);
  console.log(`   출력 파일: ${htmlFileName}\n`);

  try {
    // JSON 파일 읽기
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // HTML 생성
    const html = generateHtmlContent(jsonData, jsonFile);
    
    // HTML 파일 저장
    fs.writeFileSync(htmlPath, html, 'utf8');
    
    const normalizedHtmlPath = htmlPath.replace(/\\/g, '/');
    console.log(`\n✅ HTML 리포트가 생성되었습니다!`);
    console.log(`   파일 위치: ${htmlPath}`);
    console.log(`\n💡 브라우저에서 열기:`);
    console.log(`   file:///${normalizedHtmlPath.replace(/^\//, '')}`);
    
    return htmlPath;
  } catch (error) {
    console.error('\n❌ HTML 리포트 생성 중 오류가 발생했습니다:', error.message);
    throw error;
  }
}

// HTML 콘텐츠 생성
function generateHtmlContent(data, filename) {
  const aggregate = data.aggregate || {};
  const counters = aggregate.counters || {};
  const summaries = aggregate.summaries || {};
  const intermediate = data.intermediate || [];
  
  // 테스트 정보 추출
  const totalRequests = counters['http.requests'] || 0;
  const totalVUsers = counters['vusers.created'] || 0;
  const successRequests = counters['http.codes.200'] || 0;
  const errorRequests = counters['vusers.failed'] || 0;
  const responseTime = summaries['http.response_time'] || {};
  
  // 시간별 데이터 추출
  const timeLabels = [];
  const responseTimeData = [];
  const requestRateData = [];
  
  intermediate.forEach((item, index) => {
    const timestamp = item.timestamp || (aggregate.firstCounterAt + index * 10000);
    const date = new Date(timestamp);
    timeLabels.push(date.toLocaleTimeString('ko-KR'));
    
    const rt = item.summaries?.['http.response_time']?.mean || 0;
    responseTimeData.push(rt.toFixed(2));
    
    const rate = item.rates?.['http.request_rate'] || 0;
    requestRateData.push(rate);
  });
  
  // 엔드포인트별 통계 추출
  const endpointStats = [];
  Object.keys(summaries).forEach(key => {
    if (key.includes('metrics-by-endpoint')) {
      const endpoint = key.match(/response_time\.(.+)$/)?.[1] || key;
      const stats = summaries[key];
      endpointStats.push({
        endpoint: endpoint,
        mean: stats.mean || 0,
        p50: stats.p50 || 0,
        p95: stats.p95 || 0,
        p99: stats.p99 || 0,
        count: stats.count || 0
      });
    }
  });
  
  // HTTP 상태 코드 통계
  const statusCodes = {};
  Object.keys(counters).forEach(key => {
    if (key.startsWith('http.codes.')) {
      const code = key.replace('http.codes.', '');
      statusCodes[code] = counters[key];
    }
  });
  
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Artillery 부하 테스트 리포트 - ${filename}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-card h3 {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-card .unit {
      font-size: 14px;
      color: #999;
      margin-left: 5px;
    }
    .chart-container {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .chart-container h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #333;
    }
    .chart-wrapper {
      position: relative;
      height: 400px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    thead {
      background: #667eea;
      color: white;
    }
    th, td {
      padding: 12px;
      text-align: left;
    }
    th {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 1px;
    }
    tbody tr {
      border-bottom: 1px solid #eee;
    }
    tbody tr:hover {
      background: #f9f9f9;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success {
      background: #10b981;
      color: white;
    }
    .badge-error {
      background: #ef4444;
      color: white;
    }
    .badge-warning {
      background: #f59e0b;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Artillery 부하 테스트 리포트</h1>
      <p>${filename} | 생성일: ${new Date().toLocaleString('ko-KR')}</p>
    </header>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h3>총 요청 수</h3>
        <div class="value">${totalRequests.toLocaleString()}<span class="unit">건</span></div>
      </div>
      <div class="stat-card">
        <h3>가상 사용자</h3>
        <div class="value">${totalVUsers.toLocaleString()}<span class="unit">명</span></div>
      </div>
      <div class="stat-card">
        <h3>성공 요청</h3>
        <div class="value">${successRequests.toLocaleString()}<span class="unit">건</span></div>
      </div>
      <div class="stat-card">
        <h3>실패 요청</h3>
        <div class="value">${errorRequests.toLocaleString()}<span class="unit">건</span></div>
      </div>
      <div class="stat-card">
        <h3>평균 응답 시간</h3>
        <div class="value">${(responseTime.mean || 0).toFixed(2)}<span class="unit">ms</span></div>
      </div>
      <div class="stat-card">
        <h3>P95 응답 시간</h3>
        <div class="value">${(responseTime.p95 || 0).toFixed(2)}<span class="unit">ms</span></div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>📈 시간별 응답 시간</h2>
      <div class="chart-wrapper">
        <canvas id="responseTimeChart"></canvas>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>📊 시간별 요청률</h2>
      <div class="chart-wrapper">
        <canvas id="requestRateChart"></canvas>
      </div>
    </div>
    
    ${endpointStats.length > 0 ? `
    <div class="chart-container">
      <h2>🔗 엔드포인트별 응답 시간 통계</h2>
      <table>
        <thead>
          <tr>
            <th>엔드포인트</th>
            <th>평균 (ms)</th>
            <th>P50 (ms)</th>
            <th>P95 (ms)</th>
            <th>P99 (ms)</th>
            <th>요청 수</th>
          </tr>
        </thead>
        <tbody>
          ${endpointStats.map(stat => `
            <tr>
              <td><code>${stat.endpoint}</code></td>
              <td>${stat.mean.toFixed(2)}</td>
              <td>${stat.p50.toFixed(2)}</td>
              <td>${stat.p95.toFixed(2)}</td>
              <td>${stat.p99.toFixed(2)}</td>
              <td>${stat.count.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    ${Object.keys(statusCodes).length > 0 ? `
    <div class="chart-container">
      <h2>📋 HTTP 상태 코드 분포</h2>
      <div class="chart-wrapper">
        <canvas id="statusCodeChart"></canvas>
      </div>
    </div>
    ` : ''}
  </div>
  
  <script>
    // 응답 시간 차트
    const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
    new Chart(responseTimeCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timeLabels)},
        datasets: [{
          label: '평균 응답 시간 (ms)',
          data: ${JSON.stringify(responseTimeData)},
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '응답 시간 (ms)'
            }
          }
        }
      }
    });
    
    // 요청률 차트
    const requestRateCtx = document.getElementById('requestRateChart').getContext('2d');
    new Chart(requestRateCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(timeLabels)},
        datasets: [{
          label: '요청률 (req/s)',
          data: ${JSON.stringify(requestRateData)},
          backgroundColor: 'rgba(118, 75, 162, 0.6)',
          borderColor: 'rgba(118, 75, 162, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '요청률 (req/s)'
            }
          }
        }
      }
    });
    
    ${Object.keys(statusCodes).length > 0 ? `
    // 상태 코드 차트
    const statusCodeCtx = document.getElementById('statusCodeChart').getContext('2d');
    const statusCodeLabels = ${JSON.stringify(Object.keys(statusCodes))};
    const statusCodeData = ${JSON.stringify(Object.values(statusCodes))};
    const statusColors = statusCodeLabels.map(code => {
      if (code.startsWith('2')) return 'rgba(16, 185, 129, 0.6)';
      if (code.startsWith('4')) return 'rgba(239, 68, 68, 0.6)';
      if (code.startsWith('5')) return 'rgba(245, 158, 11, 0.6)';
      return 'rgba(156, 163, 175, 0.6)';
    });
    
    new Chart(statusCodeCtx, {
      type: 'doughnut',
      data: {
        labels: statusCodeLabels.map(code => 'HTTP ' + code),
        datasets: [{
          data: statusCodeData,
          backgroundColor: statusColors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    });
    ` : ''}
  </script>
</body>
</html>`;
}

// 메인 실행
async function main() {
  try {
    const reportFiles = findReportFiles();
    const selectedFile = await selectReportFile(reportFiles);
    await generateHtmlReport(selectedFile);
  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    process.exit(1);
  }
}

main();

