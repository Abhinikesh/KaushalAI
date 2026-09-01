const { Schema, model } = require('mongoose')

const uploadedMaterialSchema = new Schema(
  {
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    fileType: { type: String, required: true, enum: ['pdf', 'pptx', 'docx'] },
    materialId: { type: String, required: true, unique: true }, // UUID from ai-service
    totalChunks: { type: Number, default: 0 },
    questionsGenerated: { type: Number, default: 0 },
  },
  { timestamps: true }
)

module.exports = model('UploadedMaterial', uploadedMaterialSchema)
