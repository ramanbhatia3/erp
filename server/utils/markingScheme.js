const marksFormulaVersion = 2

const theoryMarksGroups = [
  { key: 'mst', label: 'MST Average', maxMarks: 24, componentCount: 2 },
  { key: 'assignment', label: 'Assignment Average', maxMarks: 10, componentCount: 3 },
  { key: 'attendance', label: 'Attendance', maxMarks: 6, componentCount: 1 },
  { key: 'final', label: 'Final Exam', maxMarks: 60, componentCount: 1 },
]

const defaultTheoryMarksComponents = [
  { name: 'MST 1', maxMarks: 24, group: 'mst' },
  { name: 'MST 2', maxMarks: 24, group: 'mst' },
  { name: 'Assignment 1', maxMarks: 10, group: 'assignment' },
  { name: 'Assignment 2', maxMarks: 10, group: 'assignment' },
  { name: 'Assignment 3', maxMarks: 10, group: 'assignment' },
  { name: 'Attendance', maxMarks: 6, group: 'attendance' },
  { name: 'Final Exam', maxMarks: 60, group: 'final' },
]

const labMarksGroups = [
  { key: 'lab_internal', label: 'Internal Lab Assessment', maxMarks: 30, componentCount: 3 },
  { key: 'lab_external', label: 'Final Exam', maxMarks: 20, componentCount: 1 },
]

const defaultLabMarksComponents = [
  { name: 'Viva 1', maxMarks: 10, group: 'lab_internal' },
  { name: 'Viva 2', maxMarks: 10, group: 'lab_internal' },
  { name: 'Lab Record', maxMarks: 10, group: 'lab_internal' },
  { name: 'Final Exam', maxMarks: 20, group: 'lab_external' },
]

// Default aliases for backward compatibility
const marksGroups = theoryMarksGroups
const defaultMarksComponents = defaultTheoryMarksComponents

function isLabSubject(subject) {
  if (!subject) return false
  return Boolean(
    subject.isLab === true ||
    subject.type === 'Lab' ||
    (typeof subject.name === 'string' && /\b(lab|practical|workshop)\b/i.test(subject.name)) ||
    (typeof subject.code === 'string' && /lab/i.test(subject.code))
  )
}

function getComponentsForSubject(subject, settings) {
  if (isLabSubject(subject)) {
    return defaultLabMarksComponents.map((c) => ({ ...c }))
  }
  return (settings?.marksComponents || defaultTheoryMarksComponents).map((c) => ({ ...c }))
}

function getMarksGroupsForSubject(subject) {
  if (isLabSubject(subject)) {
    return labMarksGroups
  }
  return theoryMarksGroups
}

module.exports = {
  marksFormulaVersion,
  marksGroups,
  defaultMarksComponents,
  theoryMarksGroups,
  defaultTheoryMarksComponents,
  labMarksGroups,
  defaultLabMarksComponents,
  isLabSubject,
  getComponentsForSubject,
  getMarksGroupsForSubject,
}
