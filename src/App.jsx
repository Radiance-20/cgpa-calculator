import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function App() {
  const [courses, setCourses] = useState([
    { id: Date.now(), course: "", score: 0, grade: "F", units: 0, scoreError: "" },
  ]);
  
  const [scale, setScale] = useState(5);
  const [cgpa, setCgpa] = useState(null); 
  const [displayCgpa, setDisplayCgpa] = useState(null); 
  const [animating, setAnimating] = useState(false);
  const [enteringIds, setEnteringIds] = useState([]); 
  const intervalRef = useRef(null);

  const [darkMode, setDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem("cgpa_dark_mode");
      if (stored !== null) return stored === "true";
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cgpa_dark_mode", String(darkMode));
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    // Reset results if scale changes
    setCgpa(null);
    setDisplayCgpa(null);
  }, [scale]);

  const calculateGrade = (score) => {
    if (score >= 70) return "A";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    if (score >= 45) return "D";
    if (score >= 40) return "E";
    return "F";
  };

  const gradePoints = scale === 5 
    ? { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }
    : { A: 4, B: 3, C: 2, D: 1, E: 0, F: 0 };

  const handleInputChange = (id, field, value) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== id) return course;
        const updated = { ...course };

        if (field === "score") {
          if (value === "") {
            updated.score = "";
            updated.grade = "F";
            updated.scoreError = "";
            return updated;
          }
          const num = Number(value);
          if (Number.isNaN(num)) return course;

          if (num < 0) {
            updated.score = 0;
            updated.scoreError = "Min score is 0";
            updated.grade = calculateGrade(0);
          } else if (num > 100) {
            updated.score = 100;
            updated.scoreError = "Max score is 100";
            updated.grade = calculateGrade(100);
          } else {
            updated.score = num;
            updated.scoreError = "";
            updated.grade = calculateGrade(num);
          }
        } else if (field === "units") {
          if (value === "") {
            updated.units = "";
          } else {
            const n = Number(value);
            updated.units = Number.isNaN(n) ? course.units : n;
          }
        } else {
          updated[field] = value;
        }
        return updated;
      })
    );
  };

  const addCourse = () => {
    const id = Date.now();
    const newCourse = { id, course: "", score: 0, grade: "F", units: 0, scoreError: "" };
    setCourses((c) => [...c, newCourse]);
    setEnteringIds((prev) => [...prev, id]);
    setTimeout(() => {
      setEnteringIds((prev) => prev.filter((x) => x !== id));
    }, 350);
  };

  const removeCourse = (id) => {
    setCourses((c) => c.filter((course) => course.id !== id));
  };

  const calculateCGPA = () => {
    const hasError = courses.some((c) => c.scoreError);
    if (hasError || animating) return;

    let totalPoints = 0;
    let totalUnits = 0;

    courses.forEach(({ grade, units }) => {
      const u = Number(units) || 0;
      totalPoints += (gradePoints[grade] || 0) * u;
      totalUnits += u;
    });

    const result = totalUnits === 0 ? 0 : Number((totalPoints / totalUnits).toFixed(2));
    const resultStr = result.toFixed(2);

    // FIX: Set final result IMMEDIATELY so button is clickable
    setCgpa(resultStr); 
    
    setAnimating(true);
    setDisplayCgpa(null);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 250) { 
        clearInterval(intervalRef.current);
        setDisplayCgpa(resultStr);
        setAnimating(false);
      } else {
        const rand = (Math.random() * scale).toFixed(2);
        setDisplayCgpa(rand);
      }
    }, 35);
  };

  // --- PDF GENERATION (TEXT HEADER ONLY) ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Force White Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // 2. Add Title Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Brand Blue
    doc.text("CGPA Result", pageWidth / 2, 20, { align: "center" });

    // 3. Add Date Sub-header
    doc.setFontSize(10);
    doc.setTextColor(100); // Grey
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });

    // 4. Create Table
    const tableColumn = ["Course Code", "Score", "Grade", "Units"];
    const tableRows = [];

    courses.forEach(course => {
      tableRows.push([
        course.course || "-",
        course.score,
        course.grade,
        course.units || 0
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35, 
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }, 
      styles: { halign: 'center' },
    });

    // 5. Add Final Score
    const finalY = doc.lastAutoTable.finalY + 20;
    
    doc.setFontSize(16);
    doc.setTextColor(0); 
    doc.setFont("helvetica", "bold");
    doc.text(`Final CGPA: ${cgpa}`, pageWidth / 2, finalY, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100); 
    doc.text(`(Scale: ${scale}.0)`, pageWidth / 2, finalY + 7, { align: "center" });

    // 6. Add Copyright Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`© ${new Date().getFullYear()} Radiance Joshua Technologies`, pageWidth / 2, footerY, { align: "center" });

    doc.save(`CGPA_Result.pdf`);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const hasError = courses.some((c) => c.scoreError);

  return (
    <div>
      <style>{`
        .app-container { --page-bg: #f8fafc; --header-bg: #ffffff; --card-bg: #ffffff; --text: #0f172a; --muted: #64748b; --input-bg: #f1f5f9; --border: #e2e8f0; --primary: #3b82f6; --danger: #ef4444; --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: background 500ms; }
        .app-container.dark { --page-bg: #0f172a; --header-bg: #1e293b; --card-bg: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --input-bg: #334155; --border: #334155; --primary: #60a5fa; --danger: #f87171; --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); }
        body { margin: 0; font-family: 'Inter', sans-serif; background: var(--page-bg); }
        .app-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; background: var(--page-bg); }
        .page-header { width: 100%; background: var(--header-bg); border-bottom: 1px solid var(--border); padding: 12px 0; position: sticky; top: 0; z-index: 100; transition: background 500ms; }
        .header-content { max-width: 600px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .brand-section { display: flex; align-items: center; gap: 12px; }
        h1 { font-size: 18px; font-weight: 700; margin: 0; color: var(--text); }
        .main-content { width: 100%; max-width: 600px; padding: 30px 20px 60px 20px; box-sizing: border-box; }
        .scale-selector { position: relative; display: flex; background: var(--header-bg); border: 1px solid var(--border); border-radius: 12px; padding: 4px; margin-bottom: 24px; isolation: isolate; }
        .selector-pill { position: absolute; top: 4px; left: 4px; bottom: 4px; width: calc(50% - 4px); background: var(--primary); border-radius: 8px; z-index: 1; transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        .scale-selector[data-active="4"] .selector-pill { transform: translateX(100%); }
        .scale-btn { flex: 1; z-index: 2; border: none; background: transparent; color: var(--muted); padding: 10px; font-weight: 600; cursor: pointer; transition: color 300ms; }
        .scale-btn.active { color: #fff; }
        .course-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow); transition: all 300ms; }
        .course-card.entering { transform: translateY(-15px); opacity: 0; }
        .form-group { display: flex; flex-direction: column; margin-bottom: 8px; }
        .form-group label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--muted); margin-bottom: 4px; }
        .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        input { width: 100%; box-sizing: border-box; border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 15px; background: var(--input-bg); color: var(--text); outline: none; transition: 200ms; }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        .error { color: var(--danger); font-size: 12px; margin-top: 4px; }
        .remove-btn { border: none; background: none; color: var(--danger); font-size: 12px; font-weight: 600; margin-top: 10px; cursor: pointer; text-align: right; width: 100%; opacity: 0.7; }
        .remove-btn:hover { opacity: 1; text-decoration: underline; }
        .btn { width: 100%; padding: 14px; margin-top: 12px; border: none; border-radius: 10px; color: #fff; cursor: pointer; font-weight: 600; transition: transform 0.1s; }
        .add-btn { background: var(--primary); }
        .calc-btn { background: #10b981; }
        .add-btn:active, .calc-btn:active, .dl-btn:active { transform: scale(0.98); }
        .dl-btn { background: transparent; border: 2px solid var(--primary); color: var(--primary); margin-top: 16px; }
        .dl-btn:hover { background: var(--input-bg); }
        .btn:disabled { background: var(--muted); opacity: 0.5; }
        .result-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center; box-shadow: var(--shadow); }
        .result-label { font-size: 14px; color: var(--muted); margin-bottom: 4px; }
        .result-value { font-size: 32px; font-weight: 800; color: var(--primary); }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: var(--muted); opacity: 0.6; padding-bottom: 20px; }
        .theme-btn { background: transparent; border: none; cursor: pointer; color: var(--text); padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .theme-btn:hover { background: var(--input-bg); }
        .theme-icon { width: 20px; height: 20px; stroke-width: 2; }
      `}</style>

      <div className={`app-container ${darkMode ? "dark" : ""}`}>
        <header className="page-header">
          <div className="header-content">
            <div className="brand-section">
              <h1>CGPA Calculator</h1>
            </div>
            
            <button className="theme-btn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? (
                <svg className="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="scale-selector" data-active={scale}>
            <div className="selector-pill" />
            <button className={`scale-btn ${scale === 5 ? 'active' : ''}`} onClick={() => setScale(5)}>5.0 Scale</button>
            <button className={`scale-btn ${scale === 4 ? 'active' : ''}`} onClick={() => setScale(4)}>4.0 Scale</button>
          </div>

          {courses.map((course) => (
            <div key={course.id} className={`course-card ${enteringIds.includes(course.id) ? "entering" : ""}`}>
              <div className="form-group">
                <label>Course Code</label>
                <input type="text" placeholder="e.g. MTH101" value={course.course} onChange={(e) => handleInputChange(course.id, "course", e.target.value)} />
              </div>
              <div className="row">
                <div className="form-group">
                  <label>Score</label>
                  <input type="number" placeholder="0-100" value={course.score} onChange={(e) => handleInputChange(course.id, "score", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Grade</label>
                  <input type="text" value={course.grade} readOnly style={{ textAlign: "center", fontWeight: "bold" }} />
                </div>
                <div className="form-group">
                  <label>Units</label>
                  <input type="number" placeholder="Units" value={course.units} onChange={(e) => handleInputChange(course.id, "units", e.target.value)} />
                </div>
              </div>
              {course.scoreError && <div className="error">{course.scoreError}</div>}
              <button className="remove-btn" onClick={() => removeCourse(course.id)}>Remove Course</button>
            </div>
          ))}

          <button className="btn add-btn" onClick={addCourse}>+ Add Another Course</button>
          <button className="btn calc-btn" onClick={calculateCGPA} disabled={hasError || animating}>{animating ? "Calculating..." : "Calculate CGPA"}</button>

          {/* Result Section */}
          {displayCgpa !== null && (
            <>
              <div className="result-container">
                <div className="result-label">Your Cumulative GPA</div>
                <div className="result-value">{displayCgpa}</div>
              </div>
              
              {/* Button appears immediately if cgpa exists */}
              {cgpa && (
                <button 
                  className="btn dl-btn" 
                  onClick={downloadPDF}
                  disabled={animating}
                  style={{ opacity: animating ? 0.6 : 1, cursor: animating ? 'not-allowed' : 'pointer' }}
                >
                  {animating ? "Loading PDF..." : "⬇ Download Result (PDF)"}
                </button>
              )}
            </>
          )}

          <p className="footer">© {new Date().getFullYear()} Radiance Joshua Technologies</p>
        </main>
      </div>
    </div>
  );
}