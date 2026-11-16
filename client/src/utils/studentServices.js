const feeTypes = [
  { key: 'academic', label: 'Academic fee' },
  { key: 'hostel', label: 'Hostel fee' },
  { key: 'transportation', label: 'Transportation fee' },
  { key: 'exam', label: 'Exam fee' },
]

function getStudentSemesterFees(student, semester) {
  const services = student.studentServices || {}
  const hasHostel = Boolean(services.hostel)
  const fees = {
    academic: 40000,
    hostel: hasHostel ? 20000 : 0,
    transportation: services.usesTransport ? 15000 : 0,
    exam: 1500,
  }
  const record = services.semesterFees?.find(
    (item) => item.semester === Number(semester),
  )
  const amounts = {
    academic: record?.assessedAcademic ?? fees.academic,
    hostel: record?.assessedHostel ?? fees.hostel,
    transportation: record?.assessedTransportation ?? fees.transportation,
    exam: record?.assessedExam ?? fees.exam,
  }

  return feeTypes.map(({ key, label }) => ({
    key,
    label,
    amount: amounts[key],
    paid: record?.[`${key}Paid`] || 0,
    balance: amounts[key] - (record?.[`${key}Paid`] || 0),
  }))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function getHostelLabel(hostel) {
  return {
    'girls-hostel-a': 'Girls Hostel A',
    'girls-hostel-b': 'Girls Hostel B',
    'boys-hostel-a': 'Boys Hostel A',
    'boys-hostel-b': 'Boys Hostel B',
  }[hostel] || 'No hostel assigned'
}

export {
  feeTypes,
  formatCurrency,
  getHostelLabel,
  getStudentSemesterFees,
}
