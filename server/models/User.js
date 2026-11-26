const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const semesterFeeSchema = new mongoose.Schema(
  {
    semester: { type: Number, required: true, min: 1, max: 8 },
    academicPaid: { type: Number, default: 0, min: 0 },
    hostelPaid: { type: Number, default: 0, min: 0 },
    transportationPaid: { type: Number, default: 0, min: 0 },
    examPaid: { type: Number, default: 0, min: 0 },
    assessedAcademic: { type: Number, min: 0 },
    assessedHostel: { type: Number, min: 0 },
    assessedTransportation: { type: Number, min: 0 },
    assessedExam: { type: Number, min: 0 },
  },
  { _id: false },
)

// Stores login details and the user's place in the university.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'teacher', 'student'],
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    program: {
      type: String,
      enum: ['', 'CSE', 'IT', 'ME', 'CE'],
      default: '',
    },
    startingYear: {
      type: Number,
      min: 2000,
      max: 2100,
    },
    section: {
      type: String,
      trim: true,
    },
    rollNo: {
      type: String,
      trim: true,
    },
    studentProfile: {
      gender: {
        type: String,
        enum: ['', 'male', 'female'],
        default: '',
      },
      mobileNumber: { type: String, trim: true, maxlength: 20 },
      dateOfBirth: { type: Date },
      currentAddress: { type: String, trim: true, maxlength: 500 },
      permanentAddress: { type: String, trim: true, maxlength: 500 },
      fatherName: { type: String, trim: true, maxlength: 100 },
      motherName: { type: String, trim: true, maxlength: 100 },
      guardianName: { type: String, trim: true, maxlength: 100 },
      guardianPhone: { type: String, trim: true, maxlength: 20 },
      bloodGroup: {
        type: String,
        enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      },
      class10Board: { type: String, trim: true, maxlength: 100 },
      class10Percentage: { type: Number, min: 0, max: 100 },
      class12Board: { type: String, trim: true, maxlength: 100 },
      class12Percentage: { type: Number, min: 0, max: 100 },
      favoriteSports: { type: String, trim: true, maxlength: 200 },
      hobbies: { type: String, trim: true, maxlength: 200 },
    },
    studentServices: {
      hostel: {
        type: String,
        enum: ['', 'girls-hostel-a', 'girls-hostel-b', 'boys-hostel-a', 'boys-hostel-b'],
        default: '',
      },
      hostelRoom: { type: String, trim: true, maxlength: 30, default: '' },
      usesTransport: { type: Boolean, default: false },
      semesterFees: { type: [semesterFeeSchema], default: [] },
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    availability: {
      type: [String],
      default: [],
    },
    maxLecturesPerDay: {
      type: Number,
      min: 1,
      max: 12,
      default: 6,
    },
    maxLecturesPerWeek: {
      type: Number,
      min: 1,
      max: 40,
      default: 20,
    },
  },
  { timestamps: true },
)

// Hash a new or changed password before saving the user.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return
  }

  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

userSchema.set('toJSON', {
  transform: (doc, returnedUser) => {
    delete returnedUser.password
    return returnedUser
  },
})

module.exports = mongoose.model('User', userSchema)
