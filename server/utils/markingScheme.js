const marksFormulaVersion = 2

const marksGroups = [
  { key: 'mst', label: 'MST Average', maxMarks: 24, componentCount: 2 },
  { key: 'assignment', label: 'Assignment Average', maxMarks: 10, componentCount: 3 },
  { key: 'attendance', label: 'Attendance', maxMarks: 6, componentCount: 1 },
  { key: 'final', label: 'Final Exam', maxMarks: 60, componentCount: 1 },
]

const defaultMarksComponents = [
  { name: 'MST 1', maxMarks: 24, group: 'mst' },
  { name: 'MST 2', maxMarks: 24, group: 'mst' },
  { name: 'Assignment 1', maxMarks: 10, group: 'assignment' },
  { name: 'Assignment 2', maxMarks: 10, group: 'assignment' },
  { name: 'Assignment 3', maxMarks: 10, group: 'assignment' },
  { name: 'Attendance', maxMarks: 6, group: 'attendance' },
  { name: 'Final Exam', maxMarks: 60, group: 'final' },
]

module.exports = { marksFormulaVersion, marksGroups, defaultMarksComponents }
