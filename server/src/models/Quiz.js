const { Schema, model } = require('mongoose')

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    materialId: { type: String, required: true },
    uploadedMaterialRef: { type: Schema.Types.ObjectId, ref: 'UploadedMaterial' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    questionCount: { type: Number, default: 0 },
    // Optional: competencies this quiz assesses. If empty, no competency auto-update
    // is applied after an attempt (logged but skipped — we don't fake competency changes).
    tagCompetencyIds: [{ type: Schema.Types.ObjectId, ref: 'Competency' }],
  },
  { timestamps: true }
)

module.exports = model('Quiz', quizSchema)
