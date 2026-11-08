const Settings = require('../models/Settings')

async function getMarksSettings() {
  const settings = await Settings.findOne({ key: 'university' })
  return settings || new Settings()
}

function calculateMarks(components, settings, { allowHistorical = false } = {}) {
  const configuredComponents = settings.marksComponents || []
  const submittedByName = new Map()

  for (const component of components) {
    const name = component.name.trim()
    if (submittedByName.has(name)) {
      throw new Error(`Marks component "${name}" was submitted more than once.`)
    }
    submittedByName.set(name, component)
  }

  if (!allowHistorical && submittedByName.size !== configuredComponents.length) {
    throw new Error('Marks must be provided for every configured component.')
  }

  const componentDefinitions = allowHistorical
    ? components.map((submitted) => ({
        name: submitted.name.trim(),
        maxMarks:
          submitted.maxMarks ??
          configuredComponents.find((configured) => configured.name === submitted.name)
            ?.maxMarks,
      }))
    : configuredComponents

  const calculatedComponents = componentDefinitions.map((configured) => {
    const submitted = submittedByName.get(configured.name)
    if (!submitted) {
      throw new Error(`Marks are missing for the "${configured.name}" component.`)
    }

    const marksObtained = Number(submitted.marksObtained)
    const maxMarks = Number(configured.maxMarks)
    if (!Number.isFinite(marksObtained) || marksObtained < 0 || marksObtained > maxMarks) {
      throw new Error(
        `Marks for "${configured.name}" must be between 0 and ${maxMarks}.`,
      )
    }

    if (
      !allowHistorical &&
      submitted.maxMarks !== undefined &&
      Number(submitted.maxMarks) !== maxMarks
    ) {
      throw new Error(`Maximum marks for "${configured.name}" do not match Settings.`)
    }

    return {
      name: configured.name,
      marksObtained,
      maxMarks,
    }
  })

  const total = calculatedComponents.reduce(
    (sum, component) => sum + component.marksObtained,
    0,
  )
  const maxTotal = calculatedComponents.reduce(
    (sum, component) => sum + component.maxMarks,
    0,
  )
  const percentage = maxTotal ? (total / maxTotal) * 100 : 0
  const average = calculatedComponents.length
    ? total / calculatedComponents.length
    : 0

  return {
    components: calculatedComponents,
    total: Number(total.toFixed(2)),
    maxTotal: Number(maxTotal.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
    average: Number(average.toFixed(2)),
    result: percentage >= settings.passingPercentage ? 'pass' : 'fail',
  }
}

function calculatePerformance(markRecords, settings) {
  const subjects = new Map()
  let overallTotal = 0
  let overallMaxTotal = 0
  let overallAverageTotal = 0

  for (const record of markRecords) {
    const calculated = calculateMarks(record.components, settings, {
      allowHistorical: true,
    })
    const subjectId = String(record.subject?._id || record.subject)
    const key = `${subjectId}:${record.semester}:${record.academicYear}`

    if (!subjects.has(key)) {
      subjects.set(key, {
        subject: record.subject,
        semester: record.semester,
        academicYear: record.academicYear,
        entries: 0,
        total: 0,
        maxTotal: 0,
        averageTotal: 0,
      })
    }

    const summary = subjects.get(key)
    summary.entries += 1
    summary.total += calculated.total
    summary.maxTotal += calculated.maxTotal
    summary.averageTotal += calculated.average
    overallTotal += calculated.total
    overallMaxTotal += calculated.maxTotal
    overallAverageTotal += calculated.average
  }

  const summarize = (summary) => {
    const percentage = summary.maxTotal
      ? (summary.total / summary.maxTotal) * 100
      : 0
    const average = summary.entries
      ? summary.averageTotal / summary.entries
      : 0
    return {
      subject: summary.subject,
      semester: summary.semester,
      academicYear: summary.academicYear,
      entries: summary.entries,
      total: Number(summary.total.toFixed(2)),
      maxTotal: Number(summary.maxTotal.toFixed(2)),
      percentage: Number(percentage.toFixed(2)),
      average: Number(average.toFixed(2)),
      result: percentage >= settings.passingPercentage ? 'pass' : 'fail',
    }
  }

  const overallPercentage = overallMaxTotal
    ? (overallTotal / overallMaxTotal) * 100
    : 0
  const overallAverage = markRecords.length
    ? overallAverageTotal / markRecords.length
    : 0

  return {
    subjects: [...subjects.values()].map(summarize),
    overall: {
      entries: markRecords.length,
      total: Number(overallTotal.toFixed(2)),
      maxTotal: Number(overallMaxTotal.toFixed(2)),
      percentage: Number(overallPercentage.toFixed(2)),
      average: Number(overallAverage.toFixed(2)),
      result: overallPercentage >= settings.passingPercentage ? 'pass' : 'fail',
    },
  }
}

module.exports = {
  getMarksSettings,
  calculateMarks,
  calculatePerformance,
}
