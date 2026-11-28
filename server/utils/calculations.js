const Settings = require('../models/Settings')
const {
  defaultMarksComponents,
  defaultLabMarksComponents,
  isLabSubject,
  marksFormulaVersion,
  marksGroups,
} = require('./markingScheme')

async function getMarksSettings() {
  const settings = await Settings.findOneAndUpdate(
    { key: 'university' },
    { $setOnInsert: { key: 'university' } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  )

  if (settings.marksFormulaVersion !== marksFormulaVersion) {
    settings.marksComponents = defaultMarksComponents.map((component) => ({
      ...component,
    }))
    settings.marksFormulaVersion = marksFormulaVersion
    await settings.save()
  }

  return settings
}

function calculateLegacyMarks(components, passingPercentage) {
  const total = components.reduce((sum, component) => sum + component.marksObtained, 0)
  const maxTotal = components.reduce((sum, component) => sum + component.maxMarks, 0)
  const percentage = maxTotal ? (total / maxTotal) * 100 : 0

  return {
    components,
    displayComponents: components,
    total: Number(total.toFixed(2)),
    maxTotal: Number(maxTotal.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
    average: components.length ? total / components.length : 0,
    result: percentage >= passingPercentage ? 'pass' : 'fail',
  }
}

// Round fractional marks upward while ignoring tiny JavaScript floating-point inaccuracies.
function roundMarksUp(value) {
  return Math.ceil(value - Number.EPSILON * Math.max(1, Math.abs(value)))
}

function calculateGroupedMarks(components, passingPercentage, { allowPartial = false } = {}) {
  let incomplete = false
  const displayComponents = []

  for (const group of marksGroups) {
    const groupComponents = components.filter(
      (component) => component.group === group.key,
    )

    if (groupComponents.length !== group.componentCount) {
      incomplete = true
    }
    if (groupComponents.length === 0 && allowPartial) {
      continue
    }
    if (!allowPartial && groupComponents.length !== group.componentCount) {
      throw new Error(
        `Marks require ${group.componentCount} ${group.label.toLowerCase()} component${group.componentCount === 1 ? '' : 's'}.`,
      )
    }

    let groupSum = 0
    for (const component of groupComponents) {
      groupSum += component.marksObtained
    }
    const average = groupSum / groupComponents.length

    const label = groupComponents.length === group.componentCount
      ? group.label
      : `${group.label} (${groupComponents.length}/${group.componentCount} entered)`

    displayComponents.push({
      name: label,
      marksObtained: roundMarksUp(average),
      maxMarks: group.maxMarks,
    })
  }

  let total = 0
  let maxTotal = 0
  for (const component of displayComponents) {
    total += component.marksObtained
    maxTotal += component.maxMarks
  }

  const percentage = maxTotal ? (total / maxTotal) * 100 : 0
  let result = 'fail'
  if (incomplete) {
    result = 'incomplete'
  } else if (percentage >= passingPercentage) {
    result = 'pass'
  }

  return {
    components,
    displayComponents,
    total,
    maxTotal,
    percentage: Number(percentage.toFixed(2)),
    average: displayComponents.length ? Number((total / displayComponents.length).toFixed(2)) : 0,
    result,
  }
}

function calculateLabMarks(components, passingPercentage, { allowPartial = false, allowHistorical = false } = {}) {
  let incomplete = false
  const submittedByName = new Map()
  for (const component of components) {
    submittedByName.set(component.name.trim(), component)
  }

  const displayComponents = []
  for (const configured of defaultLabMarksComponents) {
    let submitted = submittedByName.get(configured.name)
    if (!submitted && configured.name === 'Final Exam') {
      submitted = submittedByName.get('External Practical Exam')
    }

    if (!submitted) {
      incomplete = true
      if (allowPartial || allowHistorical) continue
      throw new Error(`Marks are missing for the "${configured.name}" component.`)
    }

    const marksObtained = Number(submitted.marksObtained)
    if (!Number.isFinite(marksObtained) || marksObtained < 0 || marksObtained > configured.maxMarks) {
      throw new Error(`Marks for "${configured.name}" must be between 0 and ${configured.maxMarks}.`)
    }

    displayComponents.push({
      name: configured.name,
      marksObtained: roundMarksUp(marksObtained),
      maxMarks: configured.maxMarks,
      group: configured.group,
    })
  }

  if (displayComponents.length === 0) {
    if (allowHistorical) {
      return calculateLegacyMarks(components, passingPercentage)
    }
    throw new Error('Enter marks for at least one component.')
  }

  let total = 0
  for (const component of displayComponents) {
    total += component.marksObtained
  }
  const maxTotal = 50
  const percentage = (total / maxTotal) * 100

  let result = 'fail'
  if (incomplete) {
    result = 'incomplete'
  } else if (percentage >= passingPercentage) {
    result = 'pass'
  }

  return {
    components,
    displayComponents,
    total,
    maxTotal,
    percentage: Number(percentage.toFixed(2)),
    average: Number((total / displayComponents.length).toFixed(2)),
    result,
  }
}

function calculateMarks(
  components,
  settings,
  { allowHistorical = false, allowPartial = false, subject = null } = {},
) {
  const hasDistinctLabComponents = components.some((c) =>
    c.name === 'Viva 1' ||
    c.name === 'Viva 2' ||
    c.name === 'Lab Record' ||
    c.name === 'External Practical Exam' ||
    c.name === 'Lab Performance' ||
    c.name === 'Lab Record & Viva' ||
    c.group === 'lab_internal' ||
    c.group === 'lab_external',
  )

  const isLab = isLabSubject(subject) || hasDistinctLabComponents

  if (hasDistinctLabComponents || (isLab && !components.some((c) => c.name.includes('MST')))) {
    return calculateLabMarks(components, settings.passingPercentage, {
      allowPartial,
      allowHistorical,
    })
  }

  // Otherwise, standard theory handling
  const configuredComponents = settings.marksComponents || []
  const submittedByName = new Map()

  for (const component of components) {
    const name = component.name.trim()
    if (submittedByName.has(name)) {
      throw new Error(`Marks component "${name}" was submitted more than once.`)
    }
    submittedByName.set(name, component)
  }

  if (!allowHistorical) {
    const unknownComponent = [...submittedByName.keys()].find(
      (name) => !configuredComponents.some((configured) => configured.name === name),
    )
    if (unknownComponent) {
      throw new Error(`"${unknownComponent}" is not a configured marks component.`)
    }

    const missingComponent = configuredComponents.find(
      (configured) => !submittedByName.has(configured.name),
    )
    if (!allowPartial && missingComponent) {
      throw new Error(`Marks are missing for the "${missingComponent.name}" component.`)
    }
    if (!allowPartial && submittedByName.size !== configuredComponents.length) {
      throw new Error('Marks must be provided only for configured components.')
    }
  }

  if (submittedByName.size === 0) {
    throw new Error('Enter marks for at least one component.')
  }

  const componentDefinitions = allowHistorical
    ? components.map((submitted) => ({
        name: submitted.name.trim(),
        maxMarks:
          submitted.maxMarks ??
          configuredComponents.find((configured) => configured.name === submitted.name)
            ?.maxMarks,
        group: submitted.group,
      }))
    : configuredComponents.filter((configured) =>
        submittedByName.has(configured.name),
      )

  const calculatedComponents = componentDefinitions.map((configured) => {
    const submitted = submittedByName.get(configured.name)
    if (!submitted) {
      throw new Error(`Marks are missing for the "${configured.name}" component.`)
    }
    if (
      submitted.marksObtained === undefined ||
      submitted.marksObtained === null ||
      submitted.marksObtained === ''
    ) {
      throw new Error(`Marks for "${configured.name}" are required.`)
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
      ...(configured.group ? { group: configured.group } : {}),
    }
  })

  if (
    calculatedComponents.length > 0 &&
    calculatedComponents.every((component) =>
      marksGroups.some((group) => group.key === component.group),
    )
  ) {
    return calculateGroupedMarks(
      calculatedComponents,
      settings.passingPercentage,
      { allowPartial: allowPartial || allowHistorical },
    )
  }

  if (allowHistorical) {
    return calculateLegacyMarks(
      calculatedComponents,
      settings.passingPercentage,
    )
  }

  if (configuredComponents.some((component) => !component.group)) {
    throw new Error('The configured marks components do not match the 100-mark grading scheme.')
  }

  return calculateGroupedMarks(
    calculatedComponents,
    settings.passingPercentage,
  )
}

function calculatePerformance(markRecords, settings) {
  const subjects = new Map()
  let overallTotal = 0
  let overallMaxTotal = 0
  let overallAverageTotal = 0
  let hasIncompleteMarks = false

  for (const record of markRecords) {
    const calculated = calculateMarks(record.components, settings, {
      allowHistorical: true,
      subject: record.subject,
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
        incomplete: false,
      })
    }

    const summary = subjects.get(key)
    summary.entries += 1
    summary.total += calculated.total
    summary.maxTotal += calculated.maxTotal
    summary.averageTotal += calculated.average
    if (calculated.result === 'incomplete') {
      summary.incomplete = true
      hasIncompleteMarks = true
    }
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
      result: summary.incomplete
        ? 'incomplete'
        : percentage >= settings.passingPercentage
          ? 'pass'
          : 'fail',
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
      result: hasIncompleteMarks
        ? 'incomplete'
        : overallPercentage >= settings.passingPercentage
          ? 'pass'
          : 'fail',
    },
  }
}

module.exports = {
  getMarksSettings,
  calculateMarks,
  calculateLabMarks,
  calculatePerformance,
}
