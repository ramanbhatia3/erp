function getCurrentAcademicYear(date = new Date()) {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  const year = Number(dateParts.find((part) => part.type === 'year').value)
  const month = Number(dateParts.find((part) => part.type === 'month').value)
  const startYear = month >= 7 ? year : year - 1

  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

module.exports = { getCurrentAcademicYear }
