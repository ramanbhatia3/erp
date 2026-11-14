function getSemesterLabel(semester) {
  const value = Number(semester)
  if (!Number.isInteger(value) || value < 1)   return `Semester ${semester}`

  const lastTwoDigits = value % 100
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th')

  return `${value}${suffix}`
}

function formatClassLabel(classItem) {
  const section = classItem.section ? ` ${classItem.section}` : ''
  return `${classItem.name} ${getSemesterLabel(classItem.semester)}${section}`
}

function sortClassesBySemester(classes) {
  return [...classes].sort((first, second) =>
    Number(first.semester) - Number(second.semester) ||
    String(first.section || '').localeCompare(String(second.section || '')) ||
    String(first.name || '').localeCompare(String(second.name || '')),
  )
}

export { formatClassLabel, sortClassesBySemester }
