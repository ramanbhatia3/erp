const feeNames = ['academic', 'hostel', 'transportation', 'exam']

function getSemesterFees(user, semester) {
  const services = user.studentServices || {}
  const hasHostel = Boolean(services.hostel)
  const record = services.semesterFees?.find(
    (item) => item.semester === semester,
  )
  const fees = {
    academic: record?.assessedAcademic ?? 40000,
    hostel: record?.assessedHostel ?? (hasHostel ? 20000 : 0),
    transportation: record?.assessedTransportation ?? (services.usesTransport ? 15000 : 0),
    exam: record?.assessedExam ?? 1500,
  }
  const paid = {
    academic: record?.academicPaid || 0,
    hostel: record?.hostelPaid || 0,
    transportation: record?.transportationPaid || 0,
    exam: record?.examPaid || 0,
  }
  const feeDetails = Object.fromEntries(
    feeNames.map((name) => [
      name,
      { amount: fees[name], paid: paid[name], balance: fees[name] - paid[name] },
    ]),
  )
  const total = feeNames.reduce((sum, name) => sum + fees[name], 0)
  const totalPaid = feeNames.reduce((sum, name) => sum + paid[name], 0)

  return {
    semester,
    fees: feeDetails,
    total,
    totalPaid,
    balance: total - totalPaid,
  }
}

function getStudentServices(user) {
  return {
    hostel: user.studentServices?.hostel || '',
    hostelRoom: user.studentServices?.hostelRoom || '',
    usesTransport: user.studentServices?.usesTransport || false,
    semesters: Array.from({ length: 8 }, (_, index) =>
      getSemesterFees(user, index + 1),
    ),
  }
}

module.exports = { feeNames, getSemesterFees, getStudentServices }
