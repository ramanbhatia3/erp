function getSemesterLabel(semester) {
  const value = Number(semester)
  if (!Number.isInteger(value) || value < 1)   return `Semester ${semester}`

  const lastTwoDigits = value % 100
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th')

  return `${value}${suffix}`
}

function getSemesterTerm(semester) {
  return Number(semester) % 2 === 1
    ? 'Odd semester · July–December'
    : 'Even semester · January–June'
}

function formatClassLabel(classItem) {
  return `${classItem.name} ${getSemesterLabel(classItem.semester)}`
}

function sortClassesBySemester(classes) {
  return [...classes].sort((first, second) =>
    Number(first.semester) - Number(second.semester) ||
    String(first.name || '').localeCompare(String(second.name || '')),
  )
}

export { formatClassLabel, getSemesterTerm, sortClassesBySemester }
