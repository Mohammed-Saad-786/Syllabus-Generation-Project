(function () {
  "use strict";

  const state = {
    meta: {},
    syllabus: null,
    editMode: true,
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const formCard = $("#form-card");
  const resultSection = $("#result-section");
  const syllabusRoot = $("#syllabus-root");
  const form = $("#syllabus-form");
  const generateBtn = $("#generate-btn");
  const aiStatus = $("#ai-status");
  const toastEl = $("#toast");
 /* =========================================
   INTRO OVERLAY
========================================= */

const introOverlay =
  document.getElementById("intro-overlay");

const introContinueBtn =
  document.getElementById("intro-continue-btn");
  


if (introContinueBtn && introOverlay) {

  introContinueBtn.addEventListener("click", () => {

    introOverlay.classList.add("hidden");

  });

}

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------
  function showToast(message, isError) {
    toastEl.textContent = message;
    toastEl.classList.toggle("error", !!isError);
    toastEl.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toastEl.hidden = true), 3800);
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function getPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }

  function validateFormData(meta, courseObjectives, additionalRequirements) {
  const credits = Number(meta.credits);
  const duration = Number(meta.duration_weeks);
  const unitCount = Number(meta.unit_count);

  if (!meta.course_name || !meta.level || !meta.semester) {
    return "Please fill in all required fields.";
  }

  if (!["Undergraduate", "Postgraduate", "Diploma"].includes(meta.level)) {
    return "Please select a valid course level.";
  }

  if (!Number.isInteger(credits) || credits < 1 || credits > 10) {
    return "Credits must be a whole number between 1 and 10.";
  }

  if (!Number.isInteger(duration) || duration < 1 || duration > 52) {
    return "Duration must be a whole number between 1 and 52 weeks.";
  }

  if (![4, 5, 6, 8].includes(unitCount)) {
    return "Please select a valid number of units.";
  }

  if (meta.course_name.length > 150) {
    return "Course name cannot exceed 150 characters.";
  }

  if (meta.course_code.length > 40) {
    return "Course code cannot exceed 40 characters.";
  }

  if (meta.semester.length > 50) {
    return "Semester cannot exceed 50 characters.";
  }

  if (courseObjectives.length > 4000 || additionalRequirements.length > 4000) {
    return "Objectives and additional requirements must not exceed 4000 characters each.";
  }

  return null;
}

  // ---------------------------------------------------------------------
  // Form submit -> call /api/generate
  // ---------------------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const meta = {
      course_name: $("#course_name").value.trim(),
      course_code: $("#course_code").value.trim(),
      level: $("#level").value,
      semester: $("#semester").value.trim(),
      credits: $("#credits").value.trim(),
      duration_weeks: $("#duration_weeks").value.trim(),
      unit_count: $("#unit_count").value,
    };
    const course_objectives = $("#course_objectives").value.trim();
    const additional_requirements = $("#additional_requirements").value.trim();

    const validationError = validateFormData(
  meta,
  course_objectives,
  additional_requirements
);

if (validationError) {
  showToast(validationError, true);
  return;
}

    if (!meta.course_name || !meta.level || !meta.semester || !meta.credits || !meta.duration_weeks) {
      showToast("Please fill in all required fields.", true);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, course_objectives, additional_requirements }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "Something went wrong while generating the syllabus.");
      }

      state.meta = data.meta;
      state.syllabus = data.syllabus;
      state.editMode = true;

      $("#result-title").textContent = `${state.meta.course_name} — Syllabus`;
      if (data.ai_generated) {
        aiStatus.innerHTML = `<span class="status-ok">● AI-generated</span> · ${escapeHtml(state.meta.level)} · Semester ${escapeHtml(state.meta.semester)} · ${escapeHtml(String(state.meta.credits))} credits · ${escapeHtml(String(state.meta.duration_weeks))} weeks`;
      } else {
        aiStatus.innerHTML = `<span class="status-warn">● ${escapeHtml(data.warning || "Baseline generation used")}</span>`;
      }

      renderSyllabus();
      formCard.hidden = true;
      resultSection.hidden = false;
      resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showToast(err.message || "Failed to generate syllabus.", true);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    $(".btn-text", generateBtn).hidden = isLoading;
    $(".btn-spinner", generateBtn).hidden = !isLoading;
  }

  // ---------------------------------------------------------------------
  // Rendering the editable syllabus
  // ---------------------------------------------------------------------
  function renderSyllabus() {
    const s = state.syllabus;
    const edit = state.editMode;
    let html = "";

    html += sectionBlock("1", "Prerequisites", textField(s.prerequisites, "prerequisites", edit, 2));
    html += sectionBlock("2", "Course Overview", textField(s.overview, "overview", edit, 5));
    html += sectionBlock("3", "Course Objectives", listField(s.objectives, "objectives", edit));
    html += sectionBlock("4", "Course Outcomes", `<p class="static-text" style="margin-top:-4px;margin-bottom:12px;">After completion of the course, students should be able to:</p>` + listField(s.outcomes, "outcomes", edit));

    let unitsHtml = "";
    s.units.forEach((u, i) => {
      unitsHtml += renderUnit(u, i, edit);
    });
    html += sectionBlock("5", "Unit-wise Syllabus", unitsHtml, true);

    html += sectionBlock("6", "Text Books", listField(s.text_books, "text_books", edit));
    html += sectionBlock("7", "Reference Books", listField(s.reference_books, "reference_books", edit));
    html += sectionBlock("8", "Electronic Resources", listField(s.electronic_resources, "electronic_resources", edit));

    syllabusRoot.innerHTML = html;

    $$("textarea", syllabusRoot).forEach((t) => { autoGrow(t); t.addEventListener("input", () => autoGrow(t)); });
    bindEvents();
  }

  function sectionBlock(num, title, innerHtml, noPad) {
    return `
      <div class="card ${noPad ? "" : ""}">
        <h3 class="block-title"><span class="pill">${num}</span> ${escapeHtml(title)}</h3>
        ${innerHtml}
      </div>`;
  }

  function textField(value, path, edit, rows) {
    if (!edit) return `<p class="static-text">${escapeHtml(value || "")}</p>`;
    return `<textarea class="full" rows="${rows || 3}" data-path="${path}">${escapeHtml(value || "")}</textarea>`;
  }

  function listField(arr, path, edit) {
    arr = arr || [];
    let html = `<div class="list-wrap" data-list="${path}">`;
    arr.forEach((val, i) => {
      if (edit) {
        html += `
          <div class="list-item">
            <span class="bullet-dot"></span>
            <textarea rows="1" data-path="${path}.${i}">${escapeHtml(val)}</textarea>
            <button type="button" class="remove-btn" data-remove="${path}" data-index="${i}" title="Remove">✕</button>
          </div>`;
      } else {
        html += `<div class="list-item"><span class="bullet-dot"></span><p class="static-text" style="margin:0;">${escapeHtml(val)}</p></div>`;
      }
    });
    html += "</div>";
    if (edit) {
      html += `<button type="button" class="btn btn-add btn-sm" data-add="${path}">+ Add item</button>`;
    }
    return html;
  }

  function renderUnit(u, i, edit) {
    const base = `units.${i}`;
    let html = `<div class="unit-card">`;
    html += `<div class="unit-title-row">
        <span class="unit-tag">UNIT - ${escapeHtml(u.number)}</span>
        ${edit
          ? `<input type="text" data-path="${base}.title" value="${escapeHtml(u.title)}">`
          : `<strong>${escapeHtml(u.title)}</strong>`}
      </div>`;

    html += `<div class="sub-block">
        <div class="sub-block-label">Topics &amp; Sub-topics</div>
        ${textField(u.topics, `${base}.topics`, edit, 4)}
      </div>`;

    html += `<div class="sub-block">
        <div class="sub-block-label">Assignments (5)</div>
        ${listField(u.assignments, `${base}.assignments`, edit)}
      </div>`;

    html += `<div class="sub-block">
        <div class="sub-block-label">Unit Test Questions (2)</div>
        ${listField(u.unit_tests, `${base}.unit_tests`, edit)}
      </div>`;

    html += `</div>`;
    if (i < state.syllabus.units.length - 1) html += `<div class="unit-divider"></div>`;
    return html;
  }

  // ---------------------------------------------------------------------
  // Event binding (input updates, add/remove list items)
  // ---------------------------------------------------------------------
  function bindEvents() {
    $$("[data-path]", syllabusRoot).forEach((el) => {
      el.addEventListener("input", () => {
        setPath(state.syllabus, el.dataset.path, el.value);
      });
    });

    $$("[data-remove]", syllabusRoot).forEach((btn) => {
      btn.addEventListener("click", () => {
        const path = btn.dataset.remove;
        const idx = parseInt(btn.dataset.index, 10);
        const arr = getPath(state.syllabus, path);
        arr.splice(idx, 1);
        renderSyllabus();
      });
    });

    $$("[data-add]", syllabusRoot).forEach((btn) => {
      btn.addEventListener("click", () => {
        const path = btn.dataset.add;
        const arr = getPath(state.syllabus, path);
        arr.push("New item — click to edit.");
        renderSyllabus();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Toolbar actions
  // ---------------------------------------------------------------------
  $("#edit-toggle-btn").addEventListener("click", () => {
    state.editMode = !state.editMode;
    $("#edit-mode-label").textContent = state.editMode ? "On" : "Off";
    renderSyllabus();
  });

  $("#new-syllabus-btn").addEventListener("click", () => {
    resultSection.hidden = true;
    formCard.hidden = false;
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#download-btn").addEventListener("click", async () => {
    const btn = $("#download-btn");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Preparing…";
    try {
      const resp = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta: state.meta, syllabus: state.syllabus }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Download failed.");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(state.meta.course_name || "Syllabus").replace(/[^A-Za-z0-9_-]+/g, "_")}_Syllabus.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("DOCX downloaded successfully.");
    } catch (err) {
      showToast(err.message || "Could not download the document.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
})();
