const { Schema, model } = require('mongoose')

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    materialId: { type: String, required: true }, // ai-service UUID
    uploadedMaterialRef: { type: Schema.Types.ObjectId, ref: 'UploadedMaterial' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    questionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

module.exports = model('Quiz', quizSchema)
