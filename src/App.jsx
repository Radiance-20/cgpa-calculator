import React, { useState, useRef, useEffect } from "react";

export default function App() {
  const [courses, setCourses] = useState([
    { id: Date.now(), course: "", score: 0, grade: "F", units: 0, scoreError: "" },
  ]);
  const [cgpa, setCgpa] = useState(null); // final cgpa string like "3.45"
  const [displayCgpa, setDisplayCgpa] = useState(null); // shown during animation
  const [animating, setAnimating] = useState(false);
  const [enteringIds, setEnteringIds] = useState([]); // new cards getting entry animation
  const intervalRef = useRef(null);

  // Dark mode state (persisted)
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

  const calculateGrade = (score) => {
    if (score >= 70) return "A";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    if (score >= 45) return "D";
    if (score >= 40) return "E";
    return "F";
  };

  const gradePoints = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

  const handleInputChange = (id, field, value) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== id) return course;
        const updated = { ...course };

        if (field === "score") {
          // allow empty string while typing
          if (value === "") {
            updated.score = "";
            updated.grade = "F";
            updated.scoreError = "";
            return updated;
          }

          const num = Number(value);
          if (Number.isNaN(num)) {
            // ignore non-numeric input
            return course;
          }

          if (num < 0) {
            updated.score = 0;
            updated.scoreError = "Score cannot be less than 0 — set to 0.";
            updated.grade = calculateGrade(0);
          } else if (num > 100) {
            updated.score = 100;
            updated.scoreError = "invalid score";
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

    // mark entering for animation, remove after duration
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
      totalPoints += gradePoints[grade] * u;
      totalUnits += u;
    });

    const result = totalUnits === 0 ? 0 : Number((totalPoints / totalUnits).toFixed(2));
    const resultStr = result.toFixed(2);

    // animate: randomized flicker for ~500ms then reveal
    setAnimating(true);
    setDisplayCgpa(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 500) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setCgpa(resultStr);
        setDisplayCgpa(resultStr);
        setAnimating(false);
      } else {
        const rand = (Math.random() * 5).toFixed(2);
        setDisplayCgpa(rand);
      }
    }, 50);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const hasError = courses.some((c) => c.scoreError);

  return (
    <div>
      <style>{`
        /* Theme variables (light by default) */
        .app-container {
          --page-bg: #f5f6fa;
          --card-bg: #ffffff;
          --text: #111827;
          --muted: #6b7280;
          --input-bg: #ffffff;
          --border: #e5e7eb;
          --primary: #2563eb;
          --danger: #dc2626;
          transition: background-color 700ms ease, color 700ms ease;
        }

        .app-container.dark {
          --page-bg: #0b1220;
          --card-bg: #0f1724;
          --text: #e6eef8;
          --muted: #9aa6b2;
          --input-bg: #071226;
          --border: #1f2937;
          --primary: #60a5fa;
          --danger: #fca5a5;
        }

        html, body, #root {
          height: 100%;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background-color: var(--page-bg);
          color: var(--text);
          transition: background-color 700ms ease, color 700ms ease;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .calculator-card {
          background-color: var(--card-bg);
          width: 100%;
          max-width: 480px;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 6px 20px rgba(2,6,23,0.06);
          color: var(--text);
          transition: background-color 700ms ease, color 700ms ease, box-shadow 700ms ease, transform 350ms ease;
        }

        h1 {
          text-align: left;
          font-size: 18px;
          margin: 6px 0 14px;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .course-card {
          background-color: transparent;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
          transition: transform 350ms cubic-bezier(.2,.9,.2,1), opacity 350ms ease, max-height 350ms ease, border-color 700ms ease, background-color 700ms ease;
          transform: translateY(0);
          opacity: 1;
          overflow: hidden;
        }

        .course-card.entering {
          transform: translateY(-10px);
          opacity: 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 10px;
          padding: 0; /* ensure equal horizontal spacing */
        }

        .form-group label {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        /* Use CSS Grid to ensure the 3 small inputs exactly align to the same
           left/right edges as the full-width course input above. Grid guarantees
           the three columns fill the full width (minus gaps) so edges line up. */
        .row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
          align-items: start;
        }

        .small {
          /* grid cells take full cell width; keep for semantics */
        }

        /* Box-sizing and input consistency */
        input, textarea, select {
          box-sizing: border-box;
        }

        input {
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13px;
          background: var(--input-bg);
          color: var(--text);
          transition: background-color 450ms ease, color 450ms ease, border-color 700ms ease;
          width: 100%;
        }

        .small input {
          text-align: center;
        }

        .form-group.course input {
          width: 100%;
        }

        .error {
          color: var(--danger);
          font-size: 12px;
          margin-top: 6px;
        }

        /* Buttons */
        .btn {
          width: 100%;
          padding: 10px;
          margin-top: 10px;
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          font-weight: 600;
          transition: transform 160ms ease, background 160ms ease;
        }

        .add-btn {
          background-color: var(--primary);
        }

        .add-btn:hover { transform: translateY(-1px); }

        .calc-btn {
          background-color: #1d4ed8;
        }

        .calc-btn:hover { transform: translateY(-1px); }

        .btn:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
          opacity: 0.75;
          transform: none;
        }

        .remove-btn {
          border: none;
          background: none;
          color: var(--danger);
          font-size: 13px;
          margin-top: 8px;
          cursor: pointer;
          text-align: right;
          width: 100%;
        }

        .remove-btn:hover {
          text-decoration: underline;
        }

        .result {
          text-align: center;
          margin-top: 15px;
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .result .value {
          color: var(--primary);
          display: inline-block;
          min-width: 60px;
          font-variant-numeric: tabular-nums;
          transition: transform 300ms ease;
        }

        .result.revealed .value {
          transform: scale(1.08);
        }

        .footer {
          text-align: center;
          margin-top: 16px;
          font-size: 12px;
          color: var(--muted);
        }

        /* Toggle switch styling */
        .theme-toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .toggle {
          --width: 46px;
          --height: 28px;
          --knob-size: 22px;
          width: var(--width);
          height: var(--height);
          background: linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.02));
          border-radius: 999px;
          padding: 3px;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          border: 1px solid var(--border);
          transition: background 700ms ease, border-color 700ms ease;
        }

        .toggle[aria-pressed="true"] {
          background: linear-gradient(90deg, rgba(96,165,250,0.18), rgba(96,165,250,0.06));
        }

        .knob {
          width: var(--knob-size);
          height: var(--knob-size);
          background: var(--card-bg);
          border-radius: 50%;
          box-shadow: 0 3px 8px rgba(2,6,23,0.12);
          transform: translateX(0);
          transition: transform 700ms cubic-bezier(.2,.9,.2,1), background 700ms ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .toggle[aria-pressed="true"] .knob {
          transform: translateX(calc(var(--width) - var(--knob-size) - 6px));
        }

        .icon {
          width: 14px;
          height: 14px;
          display: inline-block;
          transition: transform 700ms ease, opacity 450ms ease;
        }

        .icon.sun {
          transform: rotate(0deg) scale(1);
          opacity: 1;
        }

        .toggle[aria-pressed="true"] .icon.sun {
          transform: rotate(-20deg) scale(0.6);
          opacity: 0;
        }

        .icon.moon {
          transform: rotate(20deg) scale(0.6);
          opacity: 0;
        }

        .toggle[aria-pressed="true"] .icon.moon {
          transform: rotate(0deg) scale(1);
          opacity: 1;
        }

        .toggle-label {
          font-size: 13px;
          color: var(--muted);
          user-select: none;
        }

        /* responsive tweaks */
        @media (max-width: 420px) {
          .calculator-card { padding: 16px; max-width: 380px; }
        }
      `}</style>

      <div className={`app-container ${darkMode ? "dark" : ""}`}>
        <div className="calculator-card" role="application" aria-label="CGPA Calculator">
          <div className="top-row">
            <h1>CGPA Calculator</h1>

            <div className="theme-toggle" aria-hidden={false}>
              <span className="toggle-label" aria-hidden="true">
                {darkMode ? "Night" : "Day"}
              </span>

              <button
                className="toggle"
                onClick={() => setDarkMode((d) => !d)}
                aria-pressed={darkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                type="button"
              >
                <span className="knob" aria-hidden="true">
                  {/* Sun icon */}
                  <svg className="icon sun" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M12 4V2M12 22v-2M4.93 4.93L3.51 3.51M20.49 20.49l-1.42-1.42M2 12H4M20 12h2M4.93 19.07l-1.42 1.42M20.49 3.51l-1.42 1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>

                  {/* Moon icon */}
                  <svg className="icon moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>

          {courses.map((course) => (
            <div
              key={course.id}
              className={`course-card ${enteringIds.includes(course.id) ? "entering" : ""}`}
            >
              <div className="form-group course">
                <label>Course</label>
                <input
                  type="text"
                  placeholder="e.g. MTH101"
                  value={course.course}
                  onChange={(e) => handleInputChange(course.id, "course", e.target.value)}
                />
              </div>

              <div className="row">
                <div className="form-group small">
                  <label>Score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={course.score}
                    onChange={(e) => handleInputChange(course.id, "score", e.target.value)}
                  />
                  {course.scoreError && <div className="error">{course.scoreError}</div>}
                </div>

                <div className="form-group small">
                  <label>Grade</label>
                  <input type="text" value={course.grade} readOnly />
                </div>

                <div className="form-group small">
                  <label>Units</label>
                  <input
                    type="number"
                    min={0}
                    value={course.units}
                    onChange={(e) => handleInputChange(course.id, "units", e.target.value)}
                  />
                </div>
              </div>

              <button className="remove-btn" onClick={() => removeCourse(course.id)}>
                Remove
              </button>
            </div>
          ))}

          <button className="btn add-btn" onClick={addCourse}>
            + Add Course
          </button>

          <button
            className="btn calc-btn"
            onClick={calculateCGPA}
            disabled={hasError || animating}
            aria-disabled={hasError || animating}
            title={hasError ? "Fix score errors to enable Calculate" : animating ? "Animating..." : "Calculate CGPA"}
          >
            Calculate
          </button>

          {displayCgpa !== null && (
            <p className={`result ${!animating && cgpa ? "revealed" : ""}`}>
              CGPA: <span className="value">{displayCgpa}</span>
            </p>
          )}

          <p className="footer">© 2025 Radiance Joshua Technologies</p>
        </div>
      </div>
    </div>
  );
}