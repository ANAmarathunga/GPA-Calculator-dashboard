import React, { useState, useEffect, useRef } from 'react';

// Grade to point mapping configuration
const gradePoints = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'E': 0.0, 'F': 0.0
};

function App() {
  const dashboardRef = useRef();

  // State to store remaining modules count for prediction estimation
  const [remainingModules, setRemainingModules] = useState(() => {
    return localStorage.getItem('gpa_remaining_modules') || '4';
  });

  // Load semester data from localStorage or initialize with defaults
  const [semesters, setSemesters] = useState(() => {
    const localData = localStorage.getItem('gpa_semesters');
    return localData ? JSON.parse(localData) : [
      { id: 1, name: 'Semester 1', subjects: [{ id: 1, name: '', credits: '3', grade: 'A' }] }
    ];
  });

  // State to store target GPA goals
  const [targetGpa, setTargetGpa] = useState(() => localStorage.getItem('gpa_target') || '3.70');

  // Sync data states to localStorage dynamically
  useEffect(() => { localStorage.setItem('gpa_semesters', JSON.stringify(semesters)); }, [semesters]);
  useEffect(() => { localStorage.setItem('gpa_target', targetGpa); }, [targetGpa]);
  useEffect(() => { localStorage.setItem('gpa_remaining_modules', remainingModules); }, [remainingModules]);

  // Handle adding a completely new semester structure
  const addSemester = () => {
    const newId = semesters.length > 0 ? semesters[semesters.length - 1].id + 1 : 1;
    setSemesters([...semesters, { id: newId, name: `Semester ${newId}`, subjects: [{ id: 1, name: '', credits: '3', grade: 'A' }] }]);
  };

  // Handle removing a semester block
  const removeSemester = (semId) => { setSemesters(semesters.filter(sem => sem.id !== semId)); };

  // Handle adding a new module row into a specific semester
  const addSubject = (semId) => {
    setSemesters(semesters.map(sem => {
      if (sem.id === semId) {
        const newId = sem.subjects.length > 0 ? sem.subjects[sem.subjects.length - 1].id + 1 : 1;
        return { ...sem, subjects: [...sem.subjects, { id: newId, name: '', credits: '3', grade: 'A' }] };
      }
      return sem;
    }));
  };

  // Handle removing a specific module from a semester block
  const removeSubject = (semId, subId) => {
    setSemesters(semesters.map(sem => {
      if (sem.id === semId) return { ...sem, subjects: sem.subjects.filter(sub => sub.id !== subId) };
      return sem;
    }));
  };

  // Handle data input changes dynamically inside course rows
  const handleInputChange = (semId, subId, field, value) => {
    setSemesters(semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          subjects: sem.subjects.map(sub => (sub.id === subId ? { ...sub, [field]: value } : sub))
        };
      }
      return sem;
    }));
  };

  // Reset all local dashboard configuration states
  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear all dashboard records?")) {
      setSemesters([{ id: 1, name: 'Semester 1', subjects: [{ id: 1, name: '', credits: '3', grade: 'A' }] }]);
      setTargetGpa('3.70');
      setRemainingModules('4');
    }
  };

  // Calculate terminal semester specific GPA results
  const calculateSemesterGPA = (subjectsList) => {
    let totalPoints = 0, totalCredits = 0;
    subjectsList.forEach(sub => {
      const credit = parseFloat(sub.credits);
      if (!isNaN(credit) && credit > 0) {
        totalPoints += credit * gradePoints[sub.grade];
        totalCredits += credit;
      }
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  // Generate cumulative parameters for global metrics
  const getOverallSummary = () => {
    let totalPoints = 0, totalCredits = 0;
    semesters.forEach(sem => {
      sem.subjects.forEach(sub => {
        const credit = parseFloat(sub.credits);
        if (!isNaN(credit) && credit > 0) {
          totalPoints += credit * gradePoints[sub.grade];
          totalCredits += credit;
        }
      });
    });
    return { totalPoints, totalCredits, cgpa: totalCredits > 0 ? totalPoints / totalCredits : 0 };
  };

  // Calculate required baseline estimations to hit targeted results
  const generateTargetPlan = () => {
    const summary = getOverallSummary();
    const currentCGPA = summary.cgpa;
    const target = parseFloat(targetGpa);
    const remModulesCount = parseInt(remainingModules);

    if (!currentCGPA || isNaN(target) || isNaN(remModulesCount) || remModulesCount <= 0) {
      return { status: 'info', text: 'Enter your subjects, target GPA, and remaining modules to generate a roadmap.', color: '#475569' };
    }

    if (currentCGPA >= target) {
      return { status: 'success', text: '🎉 Excellent! Your current CGPA already meets or exceeds your target. Maintain this level!', color: '#16a34a' };
    }

    // Rough estimation processing assuming 3 credits benchmark per module
    const remainingCredits = remModulesCount * 3;
    const requiredTotalPoints = (summary.totalCredits + remainingCredits) * target;
    const pointsNeeded = requiredTotalPoints - summary.totalPoints;
    const requiredAverageGPA = pointsNeeded / remainingCredits;

    if (requiredAverageGPA > 4.0) {
      return { status: 'danger', text: `⚠️ Mathematically Unreachable: To hit ${target.toFixed(2)}, you need an average GPA of ${requiredAverageGPA.toFixed(2)} in remaining tasks, which exceeds the max 4.00 limit.`, color: '#dc2626' };
    }

    let suggestedGrade = 'A+';
    if (requiredAverageGPA <= 2.0) suggestedGrade = 'C';
    else if (requiredAverageGPA <= 2.7) suggestedGrade = 'B-';
    else if (requiredAverageGPA <= 3.0) suggestedGrade = 'B';
    else if (requiredAverageGPA <= 3.3) suggestedGrade = 'B+';
    else if (requiredAverageGPA <= 3.7) suggestedGrade = 'A-';
    else suggestedGrade = 'A / A+';

    return {
      status: 'action',
      text: `🎯 Target Strategy: To achieve your target of ${target.toFixed(2)}, you must maintain a minimum average GPA of ${requiredAverageGPA.toFixed(2)} across all remaining ${remModulesCount} modules. Aim for a minimum grade of "${suggestedGrade}" in every upcoming exam.`,
      color: '#2563eb'
    };
  };

  const summary = getOverallSummary();
  const overallCgpa = summary.totalCredits > 0 ? summary.cgpa.toFixed(2) : '0.00';
  
  // Evaluate honors degree dynamic thresholds
  const getDegreeClass = (gpaStr) => {
    const gpa = parseFloat(gpaStr);
    if (gpa === 0) return { text: 'No data', color: '#4a5568' };
    if (gpa >= 3.70) return { text: '🏆 First Class Honours!', color: '#2f855a' };
    if (gpa >= 3.30) return { text: '🥈 Second Class Upper', color: '#2b6cb0' };
    if (gpa >= 3.00) return { text: '🥉 Second Class Lower', color: '#c05621' };
    return { text: '🎓 General Degree', color: '#6b46c1' };
  };

  const classStatus = getDegreeClass(overallCgpa);
  const targetPlan = generateTargetPlan();

  return (
    <div className="dashboard-container" style={{ 
      backgroundImage: 'url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920")',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      minHeight: '100vh', padding: '40px 20px', boxSizing: 'border-box', position: 'relative'
    }}>
      
      {/* Styles optimization layout rules targeting layout breaks inside PDFs */}
      <style>{`
        @media print {
          .dashboard-container { background: none !important; padding: 0 !important; }
          .bg-overlay, .no-print { display: none !important; }
          .printable-card { box-shadow: none !important; padding: 10px !important; background: #fff !important; maxWidth: 100% !important; width: 100% !important; }
          .semester-box { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 25px !important; border: 1px solid #cbd5e1 !important; background: #fff !important; }
          .results-layout { display: block !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          .target-container { margin-top: 20px !important; border: 2px solid #cbd5e1 !important; }
          input, select { border: none !important; background: transparent !important; appearance: none; pointer-events: none; padding: 5px 0 !important; color: #000 !important; }
          button { display: none !important; }
        }
      `}</style>
      
      <div className="bg-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(1px)', zIndex: 1 }}></div>

      <div className="main-card" style={{ maxWidth: '750px', margin: '0 auto', position: 'relative', zIndex: 2, fontFamily: '"Segoe UI", Arial, sans-serif' }}>
        
        {/* Navigation Core Control Center Header */}
        <div className="no-print" style={{ backgroundColor: 'rgba(255,255,255,0.95)', padding: '15px 20px', borderRadius: '16px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', width: '100%' }}>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>TARGET GPA:</span>
                <input type="number" step="0.01" max="4.00" min="0.00" value={targetGpa} onChange={(e) => setTargetGpa(e.target.value)} style={{ padding: '6px 10px', width: '70px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#2563eb' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>REMAINING MODULES:</span>
                <input type="number" min="1" value={remainingModules} onChange={(e) => setRemainingModules(e.target.value)} style={{ padding: '6px 10px', width: '60px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#2563eb' }} />
              </div>
            </div>

            <button type="button" onClick={() => window.print()} style={{ padding: '10px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              📥 Download Report PDF
            </button>

            <button type="button" onClick={clearAllData} style={{ padding: '10px 14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Dynamic Card Area optimized for Print Exports */}
        <div className="printable-card" ref={dashboardRef} style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '24px', padding: '35px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: '800', fontSize: '34px' }}>Academic GPA Dashboard</h2>
            <p style={{ margin: '0', color: '#64748b', fontSize: '15px' }}>Manage semesters, set targets and predict goals</p>
          </div>

          {semesters.map((sem) => (
            <div key={sem.id} className="semester-box" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ fontWeight: '700', fontSize: '18px', color: '#334155' }}>{sem.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '13px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                    GPA: {calculateSemesterGPA(sem.subjects)}
                  </span>
                  {semesters.length > 1 && (
                    <button type="button" onClick={() => removeSemester(sem.id)} className="no-print" style={{ backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {sem.subjects.map((sub, index) => (
                <div key={sub.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#94a3b8', width: '25px' }}>{index + 1}</span>
                  <input type="text" placeholder="Subject Name" value={sub.name} onChange={(e) => handleInputChange(sem.id, sub.id, 'name', e.target.value)} style={{ padding: '8px 12px', flex: 1, borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  <input type="number" placeholder="Credits" value={sub.credits} onChange={(e) => handleInputChange(sem.id, sub.id, 'credits', e.target.value)} style={{ padding: '8px 12px', width: '75px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} min="0" />
                  <select value={sub.grade} onChange={(e) => handleInputChange(sem.id, sub.id, 'grade', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}>
                    {Object.keys(gradePoints).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {sem.subjects.length > 1 && (
                    <button type="button" onClick={() => removeSubject(sem.id, sub.id)} className="no-print" style={{ backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              ))}

              <button type="button" onClick={() => addSubject(sem.id)} className="no-print" style={{ marginTop: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                + Add Module
              </button>
            </div>
          ))}

          <button type="button" onClick={addSemester} className="no-print" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>
            + Add New Semester
          </button>

          <hr className="no-print" style={{ margin: '35px 0', border: '0', borderTop: '2px dashed #e2e8f0' }} />

          {/* Core Results Footer Block Layout */}
          <div className="results-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Displaying Global Cumulative CGPA Stats */}
            <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', padding: '25px', borderRadius: '18px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: '700' }}>Overall CGPA</h4>
              <div style={{ color: '#0f172a', fontSize: '50px', fontWeight: '900', margin: '5px 0' }}>{overallCgpa}</div>
              <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '20px', backgroundColor: '#fff', color: classStatus.color, fontWeight: '700', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                {classStatus.text}
              </div>
            </div>

            {/* Target Prediction Strategic Roadmap Advisor */}
            <div className="target-container" style={{ backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                🎯 TARGET PROGRESS ADVISOR
              </div>
              <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                Target CGPA Goal: <span style={{ color: '#2563eb', fontWeight: '800' }}>{targetGpa}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                Remaining Modules: <span style={{ color: '#2563eb', fontWeight: '800' }}>{remainingModules}</span>
              </div>
              <div style={{ fontSize: '13px', color: targetPlan.color, fontWeight: '600', lineHeight: '1.6', backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: `1px solid #e2e8f0` }}>
                {targetPlan.text}
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: '500', fontStyle: 'italic' }}>
                  (This roadmap is generated by assuming exactly 3 credits per each remaining module as a rough estimate)
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default App;