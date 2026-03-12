import { auth, db } from './firebase-init.js';
import { checkAuth, logout } from './auth.js';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createUserWithEmailAndPassword, getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

checkAuth('admin');

// ========================
// NAVIGATION
// ========================
const sections = {
  overview: document.getElementById('sec-overview'),
  questions: document.getElementById('sec-questions'),
  students:  document.getElementById('sec-students'),
  departments: document.getElementById('sec-departments')
};

const navLinks = {
  overview:  document.getElementById('link-overview'),
  questions: document.getElementById('link-questions'),
  students:  document.getElementById('link-students'),
  departments: document.getElementById('link-departments')
};

function showSection(key) {
  Object.values(sections).forEach(s => { if(s) s.style.display = 'none'; });
  Object.values(navLinks).forEach(l => { if(l) l.classList.remove('active'); });
  if (sections[key]) sections[key].style.display = 'block';
  if (navLinks[key]) navLinks[key].classList.add('active');
}

Object.keys(navLinks).forEach(key => {
  if (navLinks[key]) {
    navLinks[key].addEventListener('click', e => { e.preventDefault(); showSection(key); });
  }
});

document.getElementById('logoutBtn').onclick = logout;

// ========================
// REAL-TIME DATA
// ========================
let allStudents = [];
const counts = {
  students:  document.getElementById('totalStudentsCount'),
  completed: document.getElementById('testsCompletedCount'),
  avgScore:  document.getElementById('avgScorePercent'),
  questions: document.getElementById('totalQuestionsCount')
};

// Listen to Questions
onSnapshot(collection(db, "questions"), (snapshot) => {
  const tbody = document.getElementById('questionsTableBody');
  const empty = document.getElementById('questionsEmpty');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (snapshot.size === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
  }

  if (counts.questions) counts.questions.textContent = snapshot.size;

  snapshot.forEach((docSnap) => {
    const q = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:'Share Tech Mono';font-size:0.7rem;color:var(--text-muted);">${docSnap.id.substring(0,8)}</td>
      <td>${q.title || 'Untitled'}</td>
      <td><span class="badge ${q.language === 'python' ? 'badge-success' : q.language === 'c' ? 'badge-warning' : 'badge-error'}">${q.language || 'python'}</span></td>
      <td><button class="btn btn-red" style="padding:0.3rem 0.6rem;font-size:0.65rem;" onclick="window.deleteQ('${docSnap.id}')">DELETE</button></td>
    `;
    tbody.appendChild(tr);
  });
});

window.deleteQ = async (id) => {
  if (confirm("Delete this question node?")) {
    await deleteDoc(doc(db, "questions", id));
  }
};

// Listen to Students
onSnapshot(query(collection(db, "users"), where("role", "==", "student")), (snapshot) => {
  const tbody = document.getElementById('studentsTableBody');
  const empty = document.getElementById('studentsEmpty');
  if (!tbody) return;

  allStudents = [];
  tbody.innerHTML = '';

  let totalScore = 0, completedCount = 0, idx = 0;
  let departmentsMap = {};

  snapshot.forEach((docSnap) => {
    const u = docSnap.data();
    allStudents.push({ ...u, uid: docSnap.id });

    if (u.testStatus === 'completed') {
      completedCount++;
      totalScore += (u.percentage || 0);
    }

    if (u.department) {
      const dName = u.department.toUpperCase();
      if (!departmentsMap[dName]) {
        departmentsMap[dName] = { count: 0, highestMark: 0, topScorer: '', totalPercentage: 0 };
      }
      departmentsMap[dName].count++;
      if ((u.percentage || 0) >= departmentsMap[dName].highestMark) {
        if ((u.percentage || 0) > departmentsMap[dName].highestMark || !departmentsMap[dName].topScorer) {
          departmentsMap[dName].highestMark = u.percentage || 0;
          departmentsMap[dName].topScorer = u.name;
        }
      }
      departmentsMap[dName].totalPercentage += (u.percentage || 0);
    }

    idx++;
    const statusBadge = u.testStatus === 'completed'
      ? '<span class="badge badge-success">DONE</span>'
      : u.testStatus === 'started'
      ? '<span class="badge badge-warning">IN PROGRESS</span>'
      : '<span class="badge badge-muted">NOT STARTED</span>';

    const violations = u.malpracticeCount || 0;
    const vBadge = violations > 0
      ? `<span class="badge badge-error">${violations} ⚠</span>`
      : `<span class="badge badge-muted">0</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:'Share Tech Mono';color:var(--text-muted);">${idx}</td>
      <td style="font-weight:600;">${u.name || 'Student'}<br><small style="color:var(--secondary);font-size:0.6rem;">${u.department || ''}</small></td>
      <td style="font-family:'Share Tech Mono';font-size:0.75rem;color:var(--text-muted);">${u.email || ''}</td>
      <td style="font-family:'Orbitron',monospace;color:var(--primary);">${u.score || 0} <small style="font-size:0.6rem;color:var(--text-muted);">(${u.percentage || 0}%)</small></td>
      <td>${statusBadge}</td>
      <td>${vBadge}</td>
      <td style="display:flex; gap:0.5rem; align-items:center;">
        <button class="btn btn-cyan" style="padding:0.3rem 0.7rem;font-size:0.65rem;" onclick="window.exportStudentPDF(${JSON.stringify(JSON.stringify(u)).replace(/"/g, '&quot;')})">PDF</button>
        <button class="btn btn-red" style="padding:0.3rem 0.7rem;font-size:0.65rem;" onclick="window.viewProof('${docSnap.id}')">PROOF</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const deptContainer = document.getElementById('departmentsContainer');
  const deptEmpty = document.getElementById('departmentsEmpty');
  if (deptContainer) {
    // Keep only the empty state div initially
    deptContainer.innerHTML = '';
    if (deptEmpty) deptContainer.appendChild(deptEmpty);

    const deptKeys = Object.keys(departmentsMap);
    if (deptKeys.length === 0) {
      if (deptEmpty) deptEmpty.style.display = 'block';
    } else {
      if (deptEmpty) deptEmpty.style.display = 'none';

      // Group students by department
      const studentsByDept = {};
      allStudents.forEach(stu => {
        const dName = (stu.department || 'UNKNOWN').toUpperCase();
        if (!studentsByDept[dName]) studentsByDept[dName] = [];
        studentsByDept[dName].push(stu);
      });

      deptKeys.forEach((dept) => {
        const d = departmentsMap[dept];
        const avg = d.count > 0 ? Math.round(d.totalPercentage / d.count) : 0;
        
        // Sort students in this department by score descending
        const deptStudents = studentsByDept[dept].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

        const deptSection = document.createElement('div');
        deptSection.className = 'section-card';
        deptSection.style.marginBottom = '2rem';
        
        let studentsHtml = '';
        deptStudents.forEach((stu, idx) => {
          studentsHtml += `
            <tr>
              <td style="font-family:'Share Tech Mono';color:var(--text-muted);">${idx + 1}</td>
              <td style="font-weight:600;">${stu.name || 'Student'}</td>
              <td style="font-family:'Orbitron';color:var(--primary);">${stu.score || 0} <small style="font-size:0.6rem;color:var(--text-muted);">(${stu.percentage || 0}%)</small></td>
              <td>${stu.testStatus === 'completed' ? '<span class="badge badge-success">DONE</span>' : '<span class="badge badge-warning">PENDING</span>'}</td>
            </tr>
          `;
        });

        deptSection.innerHTML = `
          <div class="section-top">
            <span class="section-title">DEPARTMENT: <span style="color:var(--secondary);">${dept}</span></span>
            <div class="btn-actions" style="font-family:'Share Tech Mono'; font-size:0.7rem;">
              <span style="color:var(--text-muted); margin-right:1rem;">STUDENTS: <span style="color:#fff;">${d.count}</span></span>
              <span style="color:var(--text-muted); margin-right:1rem;">AVG: <span style="color:var(--primary);">${avg}%</span></span>
              <span style="color:var(--text-muted);">TOP: <span style="color:var(--success);">${d.highestMark}%</span></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Operator Name</th>
                <th>Score (%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${studentsHtml}
            </tbody>
          </table>
        `;
        deptContainer.appendChild(deptSection);
      });
    }
  }

  if (snapshot.size === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
  }

  if (counts.students) counts.students.textContent = snapshot.size;
  if (counts.completed) counts.completed.textContent = completedCount;
  if (counts.avgScore) counts.avgScore.textContent = completedCount > 0
    ? Math.round(totalScore / completedCount) + '%' : '0%';
});

// ========================
// QUESTION MODAL
// ========================
const qModal = document.getElementById('qModal');
document.getElementById('addQuestionBtn').onclick = () => qModal.style.display = 'flex';
document.getElementById('qModalClose').onclick = () => qModal.style.display = 'none';
document.getElementById('qModalCloseBtn').onclick = () => qModal.style.display = 'none';

document.getElementById('questionForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await addDoc(collection(db, "questions"), {
      title:       document.getElementById('qTitle').value.trim(),
      language:    document.getElementById('qLanguage').value,
      buggyCode:   document.getElementById('qBuggyCode').value.trim(),
      correctCode: document.getElementById('qCorrectCode').value.trim(),
      createdAt:   new Date().toISOString()
    });
    qModal.style.display = 'none';
    document.getElementById('questionForm').reset();
    alert('Logic node saved successfully!');
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// ========================
// TXT UPLOAD
// ========================
const txtInput = document.getElementById('txtUploadInput');
document.getElementById('uploadTxtBtn').onclick = () => txtInput.click();
txtInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const content = ev.target.result;
    // Split on ---, handle both --- and ----
    const blocks = content.split(/^---+\s*$/m).map(b => b.trim()).filter(b => b.length > 0);
    let ok = 0, fail = 0;

    for (const block of blocks) {
      try {
        // Extract TITLE
        const titleM = block.match(/^TITLE:\s*(.+)/im);
        const langM  = block.match(/^LANGUAGE:\s*(.+)/im);

        // Extract BUGGY section (everything between BUGGY: and CORRECT: or end)
        const buggyM   = block.match(/BUGGY:\s*([\s\S]*?)(?=CORRECT:|$(?!\n))/im);
        const correctM = block.match(/CORRECT:\s*([\s\S]*?)$/im);

        const title   = titleM ? titleM[1].trim() : null;
        const lang    = langM  ? langM[1].trim().toLowerCase() : 'python';
        const buggy   = buggyM ? buggyM[1].trim() : null;
        const correct = correctM ? correctM[1].trim() : ''; // CORRECT is optional

        if (title && buggy) {
          await addDoc(collection(db, "questions"), {
            title, language: lang, buggyCode: buggy,
            correctCode: correct,
            createdAt: new Date().toISOString()
          });
          ok++;
        } else {
          console.warn("Skipped block - missing TITLE or BUGGY:", block.substring(0, 100));
          fail++;
        }
      } catch (err) {
        console.error("Parse error:", err);
        fail++;
      }
    }
    alert(`Upload complete: ${ok} questions added, ${fail} skipped.`);
    txtInput.value = '';
  };
  reader.readAsText(file);
};

// ========================
// STUDENT MODAL
// ========================
const sModal = document.getElementById('sModal');
document.getElementById('addStudentBtn').onclick = () => sModal.style.display = 'flex';
document.getElementById('sModalClose').onclick = () => sModal.style.display = 'none';
document.getElementById('sModalCloseBtn').onclick = () => sModal.style.display = 'none';

document.getElementById('studentForm').onsubmit = async (e) => {
  e.preventDefault();
  const name     = document.getElementById('sName').value.trim();
  const email    = document.getElementById('sEmail').value.trim();
  const password = document.getElementById('sPassword').value;
  const department = document.getElementById('sDepartment').value.trim();
  const college    = document.getElementById('sCollege').value.trim();
  const phone      = document.getElementById('sPhone').value.trim();

  const firebaseConfig = {
    apiKey: "AIzaSyCoPbuv5rMSNKmaThp0W5FaXJNp4QKgIh0",
    authDomain: "code-bug-f6be4.firebaseapp.com",
    projectId: "code-bug-f6be4",
    storageBucket: "code-bug-f6be4.firebasestorage.app",
    messagingSenderId: "414285279691",
    appId: "1:414285279691:web:7c31d180379e3b2366864e"
  };

  try {
    let secondaryApp;
    try { secondaryApp = initializeApp(firebaseConfig, "Secondary_" + Date.now()); }
    catch { secondaryApp = initializeApp(firebaseConfig, "Secondary"); }

    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      name, email, role: "student", department, college, phone,
      testStatus: "not started",
      malpracticeCount: 0, score: 0, percentage: 0,
      mistakes: []
    });

    await signOut(secondaryAuth);
    sModal.style.display = 'none';
    document.getElementById('studentForm').reset();
    alert(`Student "${name}" registered successfully!`);
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// ========================
// IMPORT - EXCEL (Bulk)
// ========================
const excelInput = document.getElementById('excelUploadInput');
const importBtn = document.getElementById('importOperatorsBtn');
const templateBtn = document.getElementById('downloadTemplateBtn');

if (importBtn && excelInput) {
  importBtn.onclick = () => excelInput.click();
  
  excelInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          alert("The Excel file is empty.");
          return;
        }
        
        if (!confirm(`Found ${jsonData.length} operators. Proceed with bulk registration?`)) return;
        
        const firebaseConfig = {
          apiKey: "AIzaSyCoPbuv5rMSNKmaThp0W5FaXJNp4QKgIh0",
          authDomain: "code-bug-f6be4.firebaseapp.com",
          projectId: "code-bug-f6be4",
          storageBucket: "code-bug-f6be4.firebasestorage.app",
          messagingSenderId: "414285279691",
          appId: "1:414285279691:web:7c31d180379e3b2366864e"
        };
        
        let successCount = 0;
        let failCount = 0;
        
        for (const row of jsonData) {
          try {
            const name = row.Name || row.name || row.FULLNAME || row.FullName || row["Student Name"] || row["Operator Name"];
            const email = row.Email || row.email || row.EMAIL || row["Student Email"] || row["Operator Email"];
            const password = row.Password || row.password || row.PASSWORD || row["Operator Password"] || "123456"; 
            const department = row.Department || row.department || row.DEPT || row["Dept"] || "ADMIN";
            const college = row.College || row.college || row.COLLEGE || "N/A";
            const phone = row.Phone || row.phone || row.PHONE || "0000000000";
            
            if (!email || !name) {
              console.warn("Skipping row: missing Name or Email", row);
              failCount++;
              continue;
            }
            
            let secondaryApp;
            try { secondaryApp = initializeApp(firebaseConfig, "Bulk_" + Date.now() + "_" + successCount); }
            catch { secondaryApp = initializeApp(firebaseConfig, "Bulk_" + successCount); }
            
            const secondaryAuth = getAuth(secondaryApp);
            let passStr = String(password).trim();
            if (passStr.length < 6) {
              console.warn(`Password for ${email} is too short (${passStr.length}). Padding with '0' to 6 chars.`);
              passStr = passStr.padEnd(6, '0');
            }
            
            const cred = await createUserWithEmailAndPassword(secondaryAuth, email, passStr);
            
            await setDoc(doc(db, "users", cred.user.uid), {
              name, email, role: "student", department, college, phone,
              testStatus: "not started",
              malpracticeCount: 0, score: 0, percentage: 0,
              mistakes: []
            });
            
            await signOut(secondaryAuth);
            successCount++;
          } catch (err) {
            console.error(`Failed to register operator [${row.Email || row.name}]:`, err.message);
            failCount++;
          }
        }
        
        alert(`Bulk registration complete!\nSuccess: ${successCount}\nFailed: ${failCount}\n\nTip: If failures occurred, check the browser console (F12) for details.`);
        excelInput.value = '';
      } catch (err) {
        alert("Error parsing Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };
}

// ========================
// DOWNLOAD TEMPLATE
// ========================
if (templateBtn) {
  templateBtn.onclick = () => {
    const data = [
      {
        "Name": "John Doe",
        "Email": "john@example.com",
        "Password": "password123",
        "Department": "CSE",
        "College": "XYZ Engineering College",
        "Phone": "9876543210"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Operator_Import_Template.xlsx");
  };
}

// ========================
// EXPORT - EXCEL
// ========================
function doExcelExport() {
  if (allStudents.length === 0) { alert("No student data to export."); return; }

  const rows = allStudents.map((s, i) => ({
    "S.No":       i + 1,
    "Name":       s.name || "N/A",
    "Department": s.department || "N/A",
    "College":    s.college || "N/A",
    "Email":      s.email || "N/A",
    "Score":      s.score || 0,
    "Percentage": (s.percentage || 0) + "%",
    "Status":     s.testStatus || "not started",
    "Violations": s.malpracticeCount || 0
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  // Style header row width
  ws['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 30 }, { wch: 10 },
    { wch: 12 }, { wch: 15 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, `DebugMaster_Results_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.xlsx`);
}

['exportExcelBtn', 'exportExcelBtn2'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = doExcelExport;
});

// ========================
// EXPORT - PDF (Bulk)
// ========================
function doPdfExport() {
  if (allStudents.length === 0) { alert("No student data to export."); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(2, 4, 8);
  doc.rect(0, 0, 297, 297, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 242, 255);
  doc.text("DEBUG MASTER", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 170);
  doc.text("STUDENT RESULTS REPORT", 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);

  const tableData = allStudents.map((s, i) => [
    i + 1,
    s.name || "N/A",
    s.department || "N/A",
    s.email || "N/A",
    s.score || 0,
    (s.percentage || 0) + "%",
    (s.testStatus || "not started").toUpperCase(),
    s.malpracticeCount || 0
  ]);

  doc.autoTable({
    startY: 38,
    head: [["#", "Name", "Dept", "Email", "Score", "Pct", "Status", "Violations"]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [220, 220, 235],
      fillColor: [5, 10, 20],
      lineColor: [0, 100, 120],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [0, 60, 80],
      textColor: [0, 242, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: { fillColor: [8, 15, 25] },
    columnStyles: {
      0: { cellWidth: 12 },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' }
    }
  });

  doc.save(`DebugMaster_Report_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.pdf`);
}

['exportPdfBtn', 'exportPdfBtn2'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = doPdfExport;
});

// Per-student PDF
window.exportStudentPDF = (studentJson) => {
  const s = JSON.parse(studentJson);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFillColor(2, 4, 8);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 242, 255);
  doc.text("DEBUG MASTER", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(150, 150, 170);
  doc.text("INDIVIDUAL RESULT CERTIFICATE", 14, 28);

  doc.setFontSize(14);
  doc.setTextColor(220, 220, 235);
  doc.text(s.name || "Student", 14, 45);

  doc.autoTable({
    startY: 55,
    head: [["Field", "Value"]],
    body: [
      ["Name",       s.name || "N/A"],
      ["Department", s.department || "N/A"],
      ["College",    s.college || "N/A"],
      ["Phone",      s.phone || "N/A"],
      ["Email",      s.email || "N/A"],
      ["Score",      `${s.score || 0} / ${s.maxScore || 100}`],
      ["Percentage", `${s.percentage || 0}%`],
      ["Status",     (s.testStatus || "not started").toUpperCase()],
      ["Violations", `${s.malpracticeCount || 0}`]
    ],
    theme: 'grid',
    styles: {
      fontSize: 10,
      textColor: [220, 220, 235],
      fillColor: [5, 10, 20],
      lineColor: [0, 100, 120]
    },
    headStyles: {
      fillColor: [0, 60, 80],
      textColor: [0, 242, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: { fillColor: [8, 15, 25] }
  });

  doc.save(`Result_${(s.name || "student").replace(/\s+/g,'_')}.pdf`);
};

// ========================
// PROOF MODAL
// ========================
const proofModal = document.getElementById('proofModal');
if (proofModal) {
  document.getElementById('proofModalClose').onclick = () => proofModal.style.display = 'none';
}

window.viewProof = async (userId) => {
  const userObj = allStudents.find(u => u.uid === userId);
  if (!userObj) return;
  const pb = document.getElementById('proofModalBody');
  if (!pb) return;
  
  if (!userObj.mistakes || userObj.mistakes.length === 0) {
    pb.innerHTML = `<div style="padding:2rem;text-align:center;">NO MISTAKES RECORDED FOR THIS OPERATOR.</div>`;
  } else {
    pb.innerHTML = userObj.mistakes.map((m, i) => `
      <div style="margin-bottom:1.5rem; padding:1rem; border:1px solid rgba(255,62,62,0.3); background:rgba(0,0,0,0.5);">
        <h4 style="color:var(--error); margin-top:0; font-family:'Orbitron',monospace;">ERROR ${i+1}: ${m.qTitle || 'Unknown Title'}</h4>
        <div style="color:var(--text-muted); font-size:0.7rem; margin-bottom:0.5rem;">Time: ${new Date(m.time).toLocaleString()}</div>
        <div style="color:#fff; background:#111; padding:0.8rem; border-left:3px solid var(--error); overflow-x:auto;">
          <pre style="margin:0; font-family:'Fira Code', 'Consolas', monospace;">${m.codeSubmitted || '(Empty)'}</pre>
        </div>
      </div>
    `).join('');
  }
  
  proofModal.style.display = 'flex';
};
