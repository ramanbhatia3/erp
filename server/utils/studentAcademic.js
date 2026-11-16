function getStudentAcademicProgress(startingYear, date = new Date()) {
  if (startingYear === undefined || startingYear === null || startingYear === '') {
    return {
      currentSemester: null,
      academicStatus: 'unknown',
      lastCompletedSemester: null,
    }
  }

  const year = Number(startingYear)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return {
      currentSemester: null,
      academicStatus: 'unknown',
      lastCompletedSemester: null,
    }
  }

  const semesterOneStart = new Date(year, 7, 1)
  if (date < semesterOneStart) {
    return {
      currentSemester: 1,
      academicStatus: 'notStarted',
      lastCompletedSemester: 0,
    }
  }

  const termNumber =
    2 * (date.getFullYear() - year) + (date.getMonth() >= 6 ? 1 : 0)

  if (termNumber > 8) {
    return {
      currentSemester: null,
      academicStatus: 'alumni',
      lastCompletedSemester: 8,
    }
  }

  const currentSemester = Math.max(1, termNumber)
  return {
    currentSemester,
    academicStatus: 'studying',
    lastCompletedSemester: currentSemester - 1,
  }
}

module.exports = { getStudentAcademicProgress }
