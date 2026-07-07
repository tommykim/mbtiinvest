// Application State
let questions = [];
let results = [];
let currentQuestionIndex = 0;
let answers = []; // Stores numeric value (1 to 5) for each question response

// Chart Instances
let radarChartInstance = null;
let pieChartInstance = null;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnSaveImg = document.getElementById('btn-save-img');
const btnCopyLink = document.getElementById('btn-copy-link');

const progressBar = document.getElementById('quiz-progress-bar');
const progressText = document.getElementById('quiz-progress-text');
const currentQuestionNum = document.getElementById('current-question-num');
const questionText = document.getElementById('question-text');
const quizOptions = document.getElementById('quiz-options');

const resultTitle = document.getElementById('result-title');
const resultKeywords = document.getElementById('result-keywords');
const resultDescription = document.getElementById('result-description');
const resultTips = document.getElementById('result-tips');
const allocationTableBody = document.getElementById('allocation-table-body');

// Map Asset description for allocation table
const assetDescriptions = {
  "해외 주식": "글로벌 빅테크 및 미국 시장 지수 추종 우량 ETF 중심",
  "국내 주식": "코스피 시가총액 상위 대형 우량 기업 위주 구성",
  "채권": "국공채 및 신용등급 AAA 이상 우량 회사채 위주의 금리형 자산",
  "현금성 자산": "고금리 파킹통장, 단기 자금(CMA), 머니마켓펀드(MMF) 등 대기 자금"
};

// Initialize Application
async function init() {
  try {
    // Parallel fetch for questions and result mappings
    const [questionsRes, resultsRes] = await Promise.all([
      fetch('/api/questions'),
      fetch('/api/results')
    ]);

    if (!questionsRes.ok || !resultsRes.ok) {
      throw new Error('API 로딩 실패');
    }

    questions = await questionsRes.json();
    results = await resultsRes.json();

    // Attach Event Listeners
    btnStart.addEventListener('click', startQuiz);
    btnRestart.addEventListener('click', restartQuiz);
    btnSaveImg.addEventListener('click', saveResultAsImage);
    btnCopyLink.addEventListener('click', copyLinkToClipboard);

  } catch (error) {
    console.error('Initialization error:', error);
    alert('데이터를 로딩하는 중 문제가 발생했습니다. 페이지를 새로고침 해주세요.');
  }
}

// Start Quiz Session
function startQuiz() {
  currentQuestionIndex = 0;
  answers = [];
  
  // View transition
  switchView(startScreen, quizScreen);
  showQuestion(currentQuestionIndex);
}

// Render Question and choices
function showQuestion(index) {
  if (index >= questions.length) {
    showResults();
    return;
  }

  const q = questions[index];
  
  // Update Progress
  const progressPercent = Math.round((index / questions.length) * 100);
  progressBar.style.width = `${progressPercent}%`;
  progressText.textContent = `${progressPercent}% (${index} / ${questions.length})`;
  currentQuestionNum.textContent = index + 1;
  
  // Set question title
  questionText.textContent = q.question;
  
  // Render Likert Options (1 to 5 points)
  quizOptions.innerHTML = '';
  q.options.forEach((optionText, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    
    // Add option indicator circle
    const indicator = document.createElement('span');
    indicator.className = 'option-index';
    indicator.textContent = i + 1;
    
    const textNode = document.createTextNode(optionText);
    
    btn.appendChild(indicator);
    btn.appendChild(textNode);
    
    // Choice selection listener
    btn.addEventListener('click', () => handleOptionSelect(i + 1));
    quizOptions.appendChild(btn);
  });
}

// Handle answer response
function handleOptionSelect(score) {
  answers.push(score);
  currentQuestionIndex++;
  
  // Simple transition effect before showing next question
  quizScreen.style.opacity = '0.6';
  setTimeout(() => {
    quizScreen.style.opacity = '1';
    showQuestion(currentQuestionIndex);
  }, 100);
}

// Show Mapped Result Profiles and Render Charts
function showResults() {
  // 1. Calculate Score sum
  const totalScore = answers.reduce((sum, val) => sum + val, 0);

  // 2. Identify Mapped Personality Profile
  const matchedProfile = results.find(
    r => totalScore >= r.scoreRange[0] && totalScore <= r.scoreRange[1]
  ) || results[0]; // fallback stability

  // 3. Populate result text
  resultTitle.textContent = matchedProfile.title;
  resultDescription.textContent = matchedProfile.description;
  
  // Render keywords tags
  resultKeywords.innerHTML = '';
  matchedProfile.keywords.forEach(kw => {
    const span = document.createElement('span');
    span.className = 'keyword-tag';
    span.textContent = kw;
    resultKeywords.appendChild(span);
  });

  // Render behavioral tips
  resultTips.innerHTML = '';
  matchedProfile.behaviorTips.forEach(tip => {
    const li = document.createElement('li');
    li.textContent = tip;
    resultTips.appendChild(li);
  });

  // Render asset allocation detail rows
  allocationTableBody.innerHTML = '';
  matchedProfile.allocation.labels.forEach((label, i) => {
    const row = document.createElement('tr');
    
    const cellAsset = document.createElement('td');
    cellAsset.innerHTML = `<strong style="color: ${matchedProfile.allocation.colors[i]}">${label}</strong>`;
    
    const cellPercent = document.createElement('td');
    cellPercent.innerHTML = `<strong>${matchedProfile.allocation.data[i]}%</strong>`;
    
    const cellDetail = document.createElement('td');
    cellDetail.textContent = assetDescriptions[label] || '참고용 간접 투자 자산군';
    
    row.appendChild(cellAsset);
    row.appendChild(cellPercent);
    row.appendChild(cellDetail);
    
    allocationTableBody.appendChild(row);
  });

  // 4. Render Radar Chart (Investor 5-dimension indicators)
  renderRadarChart();

  // 5. Render Allocation Pie Chart
  renderPieChart(matchedProfile);

  // 6. Navigate to result view
  switchView(quizScreen, resultScreen);
}

// Calculate the 5 Core investor dimensions from answers
function calculateDimensions() {
  // Map dimensions (each dimension is 2 questions, range 2 to 10 points)
  // Stability Preference: Q1 & Q7 (Inverted so higher score = higher stability preference)
  const stabilityPref = (6 - answers[0]) + (6 - answers[6]); 
  
  // Experience & Knowledge: Q2 & Q10
  const experience = answers[1] + answers[9];
  
  // Risk Tolerance: Q4 & Q8
  const riskTolerance = answers[3] + answers[7];
  
  // Market Proactivity: Q5 & Q9
  const proactivity = answers[4] + answers[8];
  
  // Long-term Horizon: Q3 & Q6
  const horizon = answers[2] + answers[5];

  return [stabilityPref, experience, riskTolerance, proactivity, horizon];
}

// Render Radar Chart with Chart.js
function renderRadarChart() {
  const ctx = document.getElementById('radarChart').getContext('2d');
  const dimensionValues = calculateDimensions();

  // Destroy previous instance to re-render clean
  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['안정성 선호도', '경험 & 지식', '위험 감내도', '시장 적극성', '장기 투자성'],
      datasets: [{
        label: '나의 지표',
        data: dimensionValues,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366F1',
        borderWidth: 2,
        pointBackgroundColor: '#818CF8',
        pointBorderColor: '#FFF',
        pointHoverBackgroundColor: '#FFF',
        pointHoverBorderColor: '#6366F1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        r: {
          min: 2,
          max: 10,
          ticks: {
            stepSize: 2,
            display: false
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.08)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.08)'
          },
          pointLabels: {
            color: '#9CA3AF',
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 11,
              weight: 'bold'
            }
          }
        }
      }
    }
  });
}

// Render Allocation Pie Chart with Chart.js
function renderPieChart(profile) {
  const ctx = document.getElementById('pieChart').getContext('2d');

  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: profile.allocation.labels,
      datasets: [{
        data: profile.allocation.data,
        backgroundColor: profile.allocation.colors,
        borderColor: 'rgba(13, 19, 38, 0.8)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#D1D5DB',
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 11
            },
            padding: 15
          }
        }
      },
      cutout: '60%'
    }
  });
}

// Save Result Card as PNG Image using html2canvas
function saveResultAsImage() {
  const resultCard = document.getElementById('result-card');
  
  // Loading state
  const originalText = btnSaveImg.innerHTML;
  btnSaveImg.disabled = true;
  btnSaveImg.innerHTML = '이미지 생성 중...';

  // Specific options to optimize dark-mode html2canvas render
  const options = {
    useCORS: true,
    allowTaint: true,
    scale: 2, // High DPI capture
    backgroundColor: '#0D1326', // Solid background color
    logging: false
  };

  html2canvas(resultCard, options).then(canvas => {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'MBTIinvest-나의투자성향.png';
    link.href = dataUrl;
    link.click();
    
    // Restore button
    btnSaveImg.disabled = false;
    btnSaveImg.innerHTML = originalText;
  }).catch(err => {
    console.error('html2canvas rendering error:', err);
    alert('이미지 저장 중 오류가 발생했습니다. 브라우저 보안 설정을 확인하시거나 수동으로 캡처해 주세요.');
    btnSaveImg.disabled = false;
    btnSaveImg.innerHTML = originalText;
  });
}

// Copy URL link to clipboard
function copyLinkToClipboard() {
  const dummyUrl = window.location.origin;
  
  navigator.clipboard.writeText(dummyUrl).then(() => {
    // Dynamic toast notification
    const originalText = btnCopyLink.innerHTML;
    btnCopyLink.innerHTML = '링크 복사 완료! ✓';
    btnCopyLink.style.borderColor = '#10B981';
    btnCopyLink.style.color = '#10B981';
    
    setTimeout(() => {
      btnCopyLink.innerHTML = originalText;
      btnCopyLink.style.borderColor = '';
      btnCopyLink.style.color = '';
    }, 2000);
  }).catch(err => {
    console.error('Clipboard copy error:', err);
    alert('링크 복사에 실패했습니다. 브라우저 주소창의 주소를 복사해 주세요.');
  });
}

// Return to Welcome screen
function restartQuiz() {
  switchView(resultScreen, startScreen);
}

// View switching animation handler
function switchView(fromView, toView) {
  fromView.classList.remove('active');
  setTimeout(() => {
    toView.classList.add('active');
  }, 150);
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', init);
