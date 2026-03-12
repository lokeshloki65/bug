import { auth, db } from './firebase-init.js';
import { checkAuth } from './auth.js';
import {
  collection, onSnapshot, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

checkAuth('student');

// ================================
// STATE
// ================================
let questions        = [];
let currentIdx       = 0;
let userAnswers      = {};
let solvedQuestions  = new Set();
let editor;
let malpracticeCount = 0;
let timeRemaining    = 1800;
let timerInterval;
let testActive       = false;
let submitting       = false;
let pyodideReady     = false;
let pyodideLoading   = false;

// ================================
// DOM REFS
// ================================
const timerDisplay    = document.getElementById('exam-timer');
const progressBar     = document.getElementById('progress-bar');
const progressText    = document.getElementById('progress-text');
const qNumber         = document.getElementById('q-number');
const qTitleEl        = document.getElementById('q-title');
const qDescEl         = document.getElementById('q-desc-content');
const violationEl     = document.getElementById('violation-count');
const consoleOutput   = document.getElementById('console-output');
const lockdownOverlay = document.getElementById('lockdown-overlay');
const operatorName    = document.getElementById('current-username');

// ================================
// ⚠ SECURITY LOCKDOWN
// ================================
// 1. Block right-click
document.addEventListener('contextmenu', e => e.preventDefault());

// 2. Block keyboard shortcuts (copy, paste, devtools, Windows key)
document.addEventListener('keydown', e => {
  const win = e.key === 'Meta' || e.key === 'OS';    // Windows key
  const devtools = e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i','j','c','k'].includes(e.key.toLowerCase()));
  const copy = e.ctrlKey && ['c','v','a','s','u','p','x'].includes(e.key.toLowerCase());
  const altTab = e.altKey && (e.key === 'Tab' || e.key === 'F4');
  const taskMgr = e.ctrlKey && e.altKey && e.key === 'Delete';
  const printScr = e.key === 'PrintScreen';

  if (win || devtools || copy || altTab || taskMgr || printScr) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (testActive && !submitting) {
      if (devtools) triggerViolation("Attempted DevTools access");
      else if (win) triggerViolation("Windows key pressed");
    }
    return false;
  }
}, true); // capture phase — fires before anything else

// 3. Block new windows
window.open = () => { if (testActive) triggerViolation("Attempted to open new window"); return null; };

// 4. Tab / Window blur
window.addEventListener('blur', () => {
  if (testActive && !submitting) triggerViolation("Tab or window switched");
});

// 5. Desktop switch / minimize (visibilitychange)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && testActive && !submitting) {
    triggerViolation("Screen hidden (desktop or minimize)");
  }
});

// 6. Fullscreen exit → blur + overlay
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && testActive && !submitting) {
    showBlurOverlay();
    triggerViolation("Exited fullscreen");
  }
});

// 7. Restore fullscreen button
const restoreBtn = document.getElementById('restore-fullscreen');
if (restoreBtn) restoreBtn.onclick = () => enterFullscreen();

function showBlurOverlay() {
  if (lockdownOverlay) {
    lockdownOverlay.style.display = 'flex';
    // Blur the main content
    const main = document.querySelector('main') || document.querySelector('.test-main');
    if (main) main.style.filter = 'blur(12px)';
  } else {
    // Force create one if it doesn't exist
    const o = document.createElement('div');
    o.id = 'lockdown-overlay';
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    o.innerHTML = `<h1 style="color:#ff3e3e;font-family:'Orbitron',monospace;margin-bottom:2rem;">RESTRICTED AREA</h1><button id="force-restore" style="padding:1rem 2rem;background:#00f2ff;border:none;font-weight:bold;cursor:pointer;">RETURN TO SECURE TERMINAL</button>`;
    document.body.appendChild(o);
    document.getElementById('force-restore').onclick = () => enterFullscreen();
  }
}

async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
    if (lockdownOverlay) lockdownOverlay.style.display = 'none';
    const force = document.getElementById('lockdown-overlay');
    if (force) force.style.display = 'none';
    const main = document.querySelector('main') || document.querySelector('.test-main');
    if (main) main.style.filter = 'none';
  } catch {}
}

// ================================
// CUSTOM ALERT (avoids browser blur)
// ================================
function showAlert(title, msg, type = 'warning', onClose = null) {
  // Remove existing
  const existing = document.getElementById('_customAlert');
  if (existing) existing.remove();

  const color = type === 'error' ? '#ff3e3e' : type === 'success' ? '#3ef0a1' : '#ffcc00';
  const overlay = document.createElement('div');
  overlay.id = '_customAlert';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;`;
  overlay.innerHTML = `
    <div style="background:#04080f;border:1px solid ${color};padding:2.5rem;max-width:520px;width:90%;font-family:'Share Tech Mono',monospace;position:relative;">
      <div style="position:absolute;top:-1px;left:20px;background:${color};color:#000;padding:2px 10px;font-size:0.65rem;letter-spacing:2px;">${type.toUpperCase()}</div>
      <h2 style="color:${color};margin-bottom:1rem;font-family:'Orbitron',monospace;font-size:1rem;letter-spacing:2px;">${title}</h2>
      <p style="color:#cdd6f4;white-space:pre-line;margin-bottom:1.5rem;line-height:1.8;font-size:0.85rem;">${msg}</p>
      <button id="_alertOk" style="background:${color};color:#000;border:none;padding:0.8rem 2.5rem;font-family:'Share Tech Mono',monospace;font-weight:900;cursor:pointer;letter-spacing:2px;font-size:0.85rem;">OK</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('_alertOk').onclick = () => {
    overlay.remove();
    if (onClose) onClose();
  };
}

// ================================
// VIOLATION HANDLER
// ================================
async function triggerViolation(reason) {
  if (submitting) return;

  malpracticeCount++;
  const display = Math.min(malpracticeCount, 2);
  if (violationEl) {
    violationEl.textContent = `VIOLATIONS: ${display} / 2`;
    violationEl.style.color = display >= 2 ? '#ff3e3e' : '#ffcc00';
  }

  try {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        malpracticeCount,
        lastViolation: reason,
        lastViolationTime: new Date().toISOString()
      });
    }
  } catch {}

  if (malpracticeCount >= 2) {
    // Last ditch effort: if their current code is correct, give them the marks before kickout
    const q = questions[currentIdx];
    if (q && editor) {
        const studentCode = editor.getValue();
        const correctCode = q.correctCode || '';
        const score = computeScore(studentCode, correctCode, q.language);
        if (score === 4) await saveScore(4);
    }

    showAlert(
      "MALPRACTICE DETECTED",
      `Reason: ${reason}\n\nYou have reached the maximum violation limit.\nYour test is being submitted automatically.`,
      'error',
      () => finalSubmit()
    );
  } else {
    showAlert(
      "⚠ SECURITY WARNING",
      `Reason: ${reason}\n\nViolation ${malpracticeCount} / 2.\nOne more violation will AUTO-SUBMIT your test.`,
      'warning'
    );
  }
}

// ================================
// MONACO EDITOR
// ================================
require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
});

require(['vs/editor/editor.main'], () => {
  editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    value: '# Fix the bugs in the code...',
    language: 'python',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    minimap: { enabled: false },
    contextmenu: false,
    scrollBeyondLastLine: false,
  });

  // Block clipboard in editor
  const editorDom = document.getElementById('monaco-editor');
  ['copy','paste','cut'].forEach(ev => {
    editorDom.addEventListener(ev, e => e.preventDefault(), true);
  });

  loadQuestionsRealtime();
  loadUserInfo();
});

// ================================
// LOAD USER INFO
// ================================
function loadUserInfo() {
  auth.onAuthStateChanged(user => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (operatorName) operatorName.textContent = (d.name || 'OPERATOR').toUpperCase();
      malpracticeCount = d.malpracticeCount || 0;
      if (violationEl) violationEl.textContent = `VIOLATIONS: ${Math.min(malpracticeCount, 2)} / 2`;
    });
  });
}

// ================================
// REAL-TIME QUESTION LOADING
// ================================
function loadQuestionsRealtime() {
  let loaded = window.HARDCODED_QUESTIONS || [];

  if (loaded.length === 0) {
    if (qTitleEl) qTitleEl.textContent = "NO QUESTIONS FOUND";
    if (qDescEl) qDescEl.textContent = "Error: Hardcoded questions are missing.";
    return;
  }

  // First load: securely randomize questions list exactly once
  for (let i = loaded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [loaded[i], loaded[j]] = [loaded[j], loaded[i]];
  }
  questions = loaded;
  currentIdx = 0;
  renderQuestion();
  startTimer();
  
  // Entering fullscreen requires a user gesture in modern browsers.
  // We will let the "restore fullscreen" overlay handle it if they aren't in fullscreen.
  testActive = true;
}

// ================================
// RENDER QUESTION
// ================================
function renderQuestion() {
  if (questions.length === 0) return;
  // Clamp index
  if (currentIdx >= questions.length) currentIdx = questions.length - 1;
  if (currentIdx < 0) currentIdx = 0;

  const q = questions[currentIdx];

  if (qNumber) qNumber.textContent = `QUESTION ${String(currentIdx + 1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}`;
  if (qTitleEl) qTitleEl.textContent = (q.title || 'UNTITLED').toUpperCase();
  if (qDescEl) qDescEl.textContent = 'Find and fix ALL bugs in the code below. Look for: missing colons (:), wrong operators, wrong variable names, indentation errors, logic mistakes.';

  // Load saved answer or show buggy code
  const code = userAnswers[q.id] !== undefined ? userAnswers[q.id] : (q.buggyCode || '# No code available');

  if (editor) {
    editor.setValue(code);
    const lang = (q.language || 'python').toLowerCase();
    monaco.editor.setModelLanguage(editor.getModel(), lang === 'c' ? 'c' : lang === 'java' ? 'java' : 'python');
  }

  if (consoleOutput) consoleOutput.innerHTML = '<span style="color:#8899aa;">&gt; Ready. Click EXECUTE to run your code.</span>';

  updateNavButtons();
}

function updateNavButtons() {
  if (progressBar) progressBar.style.width = `${((currentIdx + 1) / questions.length) * 100}%`;
  if (progressText) progressText.textContent = `${currentIdx + 1} / ${questions.length}`;

  const prev = document.getElementById('prev-btn');
  const next = document.getElementById('next-btn');
  // Skip button should always be enabled
  if (prev) prev.disabled = false;
  if (next) next.textContent = currentIdx >= questions.length - 1 ? 'SUBMIT & FINISH' : 'SUBMIT & VERIFY';
}

function saveCurrentAnswer() {
  if (questions[currentIdx] && editor) {
    userAnswers[questions[currentIdx].id] = editor.getValue();
  }
}

// ================================
// NAVIGATION & VERIFICATION
// ================================
function initButtonHandlers() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('final-submit-btn');
  const runBtn = document.getElementById('run-code-btn');
  const clearBtn = document.getElementById('clear-console-btn');

  if (prevBtn) {
    prevBtn.textContent = 'SKIP NODE';
    prevBtn.style.display = 'block';
    prevBtn.onclick = () => {
      console.log("SKIP clicked");
      saveCurrentAnswer();
      const q = questions[currentIdx];
      const studentCode = userAnswers[q.id] || '';
      
      // Log as skipped (non-blocking)
      logMistake(q, studentCode + "\n# (SKIPPED)");
      
      if (currentIdx < questions.length - 1) { 
        currentIdx++; 
        if(editor) editor.setValue('');
        renderQuestion(); 
      } else {
        finalSubmit();
      }
    };
  }

  if (nextBtn) {
    nextBtn.textContent = 'SUBMIT & VERIFY';
    nextBtn.onclick = async () => {
      console.log("VERIFY clicked");
      saveCurrentAnswer();
      const q = questions[currentIdx];
      const studentCode = userAnswers[q.id] || '';
      const correctCode = q.correctCode || '';
      
      const score = computeScore(studentCode, correctCode, q.language);
      
      if (score === 4) {
        // Correct answer: save instantly and then show success
        if (!solvedQuestions.has(q.id)) {
          await saveScore(4);
          solvedQuestions.add(q.id);
        }
        showAlert('SUCCESS', 'Error fixed successfully! ✓', 'success', () => {
          if (currentIdx < questions.length - 1) { 
            currentIdx++; 
            if(editor) editor.setValue('');
            renderQuestion(); 
          } else {
            finalSubmit();
          }
        });
      } else {
        const mistakesMsg = findMistakes(studentCode, correctCode, q.language);
        logMistake(q, studentCode);
        showAlert('INCORRECT', `Your code still has bugs.\n\n${mistakesMsg}\n\nPlease try again.`, 'error');
      }
    };
  }

  if (submitBtn) {
    submitBtn.onclick = () => {
      showAlert(
        'CONFIRM SUBMISSION',
        'Are you sure you want to submit?\n\nYou cannot make any changes after this.',
        'warning',
        () => finalSubmit()
      );
    };
  }

  if (runBtn) runBtn.onclick = () => runCode();
  if (clearBtn) clearBtn.onclick = () => {
    if (consoleOutput) consoleOutput.innerHTML = '<span style="color:#8899aa;">&gt; Console cleared.</span>\n';
  };
}

// Call button init once DOM is ready (or here because it's a module)
initButtonHandlers();

async function logMistake(q, studentCode) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    let mistakes = [];
    if (snap.exists()) mistakes = snap.data().mistakes || [];
    
    mistakes.push({
      qId: q.id,
      qTitle: q.title,
      codeSubmitted: studentCode,
      time: new Date().toISOString()
    });
    
    await updateDoc(doc(db, "users", user.uid), { mistakes });
  } catch(e) { console.error("Could not log mistake", e); }
}

async function saveScore(marks) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      let currentScore = snap.data().score || 0;
      currentScore += marks;
      await updateDoc(doc(db, "users", user.uid), { score: currentScore });
    }
  } catch(e) { console.error(e); }
}

// ================================
// TIMER
// ================================
function startTimer() {
  timerInterval = setInterval(() => {
    timeRemaining--;
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    if (timerDisplay) {
      timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (timeRemaining <= 300) timerDisplay.style.color = '#ff3e3e';
    }
    if (timeRemaining <= 0) { clearInterval(timerInterval); finalSubmit(); }
  }, 1000);
}

// ================================
// CODE RUNNER (Pyodide)
// ================================

async function initPyodide() {
  if (pyodideReady) return true;
  if (pyodideLoading) {
    while (pyodideLoading) await new Promise(r => setTimeout(r, 300));
    return pyodideReady;
  }
  pyodideLoading = true;
  if (consoleOutput) consoleOutput.innerHTML = '<span style="color:#8899aa;">&gt; Loading Python runtime...\n&gt; (First time: ~15 seconds)</span>\n';

  try {
    if (!window.loadPyodide) throw new Error("Pyodide not loaded");
    window.pyodide = await loadPyodide();
    pyodideReady = true;
    pyodideLoading = false;
    return true;
  } catch (err) {
    if (consoleOutput) consoleOutput.innerHTML += `<span style="color:#ff3e3e;">&gt; ERROR: ${err.message}</span>`;
    pyodideLoading = false;
    return false;
  }
}

async function runCode() {
  const code = editor ? editor.getValue() : '';
  const lang = (questions[currentIdx]?.language || 'python').toLowerCase();

  if (!consoleOutput) return;
  consoleOutput.innerHTML = '<span style="color:#8899aa;">&gt; Running...</span>\n';

  if (lang === 'c' || lang === 'c++') {
    consoleOutput.innerHTML = '<span style="color:#ffcc00;">&gt; C code cannot run in the browser.</span>\n<span style="color:#8899aa;">&gt; Fix all bugs carefully, then SUBMIT for evaluation.</span>';
    return;
  }
  if (lang === 'java') {
    consoleOutput.innerHTML = '<span style="color:#ffcc00;">&gt; Java code cannot run in the browser.</span>\n<span style="color:#8899aa;">&gt; Fix all bugs carefully, then SUBMIT for evaluation.</span>';
    return;
  }

  const ok = await initPyodide();
  if (!ok) return;

  consoleOutput.innerHTML = '<span style="color:#8899aa;">&gt; OUTPUT:</span>\n';

  // Stream output directly to console
  window.pyodide.setStdout({
    raw: (ch) => {
      const c = String.fromCharCode(ch);
      const last = consoleOutput.lastChild;
      if (last && last.nodeType === 3) { last.textContent += c; }
      else { consoleOutput.appendChild(document.createTextNode(c)); }
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  });

  window.pyodide.setStderr({
    raw: (ch) => {
      let errSpan = consoleOutput.querySelector('.err-live');
      if (!errSpan) {
        errSpan = document.createElement('span');
        errSpan.className = 'err-live';
        errSpan.style.color = '#ff3e3e';
        consoleOutput.appendChild(errSpan);
      }
      errSpan.textContent += String.fromCharCode(ch);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  });

  try {
    await window.pyodide.runPythonAsync(code);
    const ok = document.createElement('span');
    ok.style.color = '#3ef0a1';
    ok.textContent = '\n> Execution complete ✓';
    consoleOutput.appendChild(ok);
  } catch (pyErr) {
    // Clean up internal Pyodide paths from error message safely
    let msg = pyErr.message || String(pyErr);
    if (msg.includes("X.default.parse is not a function") || typeof msg !== 'string') {
        msg = "SyntaxError: invalid syntax";
    } else {
        msg = msg.split('\n')
          .filter(l => !l.includes('/lib/python') && !l.includes('File "<exec>"') && l.trim())
          .join('\n');
    }
    const errSpan = document.createElement('span');
    errSpan.style.color = '#ff3e3e';
    errSpan.textContent = '\n> ERROR:\n' + msg;
    consoleOutput.appendChild(errSpan);
  }
}



// ================================
// SUBMIT
// ================================


async function finalSubmit() {
  if (submitting) return;
  submitting = true;
  testActive = false;
  // Cleanup
  const overlay = document.getElementById('_customAlert');
  if (overlay) overlay.remove();
  
  clearInterval(timerInterval);
  saveCurrentAnswer();

  const user = auth.currentUser;
  if (!user) return;

  // Replace page with evaluation screen
  document.body.innerHTML = `
    <style>
      body { margin:0; background:#020408; font-family:'Share Tech Mono',monospace; color:white; display:flex; align-items:center; justify-content:center; height:100vh; }
      .eval-box { text-align:center; max-width:600px; width:90%; }
      h1 { font-family:'Orbitron',monospace; color:#00f2ff; font-size:1.5rem; letter-spacing:4px; margin-bottom:0.5rem; }
      p { color:#8899aa; font-size:0.8rem; letter-spacing:2px; margin-bottom:2rem; }
      .bar-wrap { width:100%; height:6px; background:#0a0a0f; border:1px solid #00f2ff; margin-bottom:1rem; }
      #evalBar { height:100%; background:#00f2ff; width:0%; transition:width 0.4s; box-shadow:0 0 10px #00f2ff; }
      #evalStatus { font-size:0.75rem; color:#8899aa; margin-bottom:2rem; }
      .result-table { width:100%; border-collapse:collapse; text-align:left; margin-top:2rem; display:none; }
      .result-table th { padding:0.7rem 1rem; background:rgba(0,242,255,0.08); color:#00f2ff; font-size:0.7rem; letter-spacing:1px; border-bottom:1px solid #0a2030; }
      .result-table td { padding:0.7rem 1rem; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.05); }
      .correct { color:#3ef0a1; } .wrong { color:#ff3e3e; } .partial { color:#ffcc00; }
      .score-banner { background:rgba(0,242,255,0.08); border:1px solid #00f2ff; padding:2rem; margin:2rem 0; display:none; }
      .score-val { font-family:'Orbitron',monospace; font-size:3rem; color:#00f2ff; }
      #homeBtn { background:#00f2ff; color:#000; border:none; padding:0.9rem 2.5rem; font-family:'Share Tech Mono',monospace; font-weight:900; cursor:pointer; letter-spacing:2px; margin-top:1rem; display:none; }
    </style>
    <div class="eval-box">
      <h1>MISSION EXITED</h1>
      <p>TEST RESULTS ARE FINALIZED AND SAVED.</p>

      <div class="score-banner" style="display:block;" id="scoreBanner">
        <div style="font-size:0.7rem;color:#8899aa;letter-spacing:3px;margin-bottom:0.5rem;">YOUR STATUS</div>
        <div class="score-val" style="font-size:2rem;color:var(--success);" id="finalScore">SAVED</div>
      </div>

      <button id="homeBtn" style="display:inline-block;" onclick="window.location.href='dashboard.html'">BACK TO DASHBOARD</button>
    </div>
  `;

  // Final update
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    let scoreDisplay = "SAVED";
    if (userSnap.exists()) {
      const currentScore = userSnap.data().score || 0;
      scoreDisplay = `MARKS: ${currentScore}`;
      const maxMarks = questions.length * 4;
      const percentage = maxMarks > 0 ? Math.round((currentScore / maxMarks) * 100) : 0;
      
      await updateDoc(doc(db, "users", user.uid), {
        testStatus:  'completed',
        maxScore:    maxMarks,
        percentage,
        endTime:     new Date().toISOString()
      });
    }
    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) finalScoreEl.textContent = "MISSION ACCOMPLISHED";
  } catch (e) { console.error(e); }
}

// ================================
// EVALUATION - No AI, pure comparison
// ================================
function normalizeCode(code, lang = 'python') {
  if (!code) return '';
  let clean = code;
  
  // 1. Language-specific comment removal
  if (lang && lang.toLowerCase() === 'python') {
    clean = clean.replace(/#.*$/gm, ''); // Python comments
  } else {
    // C / Java comments
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, ''); // /* ... */
    clean = clean.replace(/\/\/.*$/gm, '');         // // ...
  }
  
  // 2. Normalize common operator variations to ensure matching
  clean = clean
    .replace(/\+\+([a-zA-Z0-9_]+)/g, '$1+=1') // ++i -> i+=1
    .replace(/([a-zA-Z0-9_]+)\+\+/g, '$1+=1') // i++ -> i+=1
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?\+\s?([a-zA-Z0-9_]+)/g, '$1+=$2')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?-\s?([a-zA-Z0-9_]+)/g, '$1-=$2')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?\*\s?([a-zA-Z0-9_]+)/g, '$1*=$2')
    .replace(/([a-zA-Z0-9_]+)\s?=\s?\1\s?\/\s?([a-zA-Z0-9_]+)/g, '$1/=$2');

  // 3. Remove all whitespace, literal \n strings, non-printable characters, AND { } braces
  const result = clean
    .replace(/\\n/g, '')               // literal \n
    .replace(/[{}]/g, '')              // remove braces
    .replace(/\s+/g, '')              // all whitespace
    .replace(/[^\x21-\x7E]/g, '')      // everything below space (CR, LF, Tab, null)
    .toLowerCase();
  
  console.log(`[DEBUG] Normalized (${lang}):`, result);
  return result;
}

function computeScore(studentCode, correctCode, lang) {
  const student = normalizeCode(studentCode, lang);
  const correct = normalizeCode(correctCode, lang);

  if (!correct) return studentCode && studentCode.trim().length > 10 ? 4 : 0;
  if (student === correct) return 4;

  // Fallback: Line-by-line similarity on normalized lines
  const sLines = (studentCode||'').split('\n').map(l => normalizeCode(l, lang)).filter(l => l);
  const cLines = (correctCode||'').split('\n').map(l => normalizeCode(l, lang)).filter(l => l);
  
  if (cLines.length === 0) return 0;

  let matchCount = 0;
  cLines.forEach(cl => { if (sLines.includes(cl)) matchCount++; });

  const ratio = matchCount / cLines.length;
  if (ratio >= 0.95) return 4;
  if (ratio >= 0.70) return 3;
  if (ratio >= 0.40) return 2;
  return 0;
}

function findMistakes(studentCode, correctCode, lang) {
  return "Your code still contains bugs. Please review your logic carefully and fix the debug to proceed.";
}

// Removed evaluateAll, evaluation happens inline per question now.
