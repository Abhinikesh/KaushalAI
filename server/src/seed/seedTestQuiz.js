/**
 * Stage 8 e2e seed — creates one test quiz with known questions and tagCompetencyIds.
 * Run from repo root: node server/src/seed/seedTestQuiz.js
 * Outputs: JSON { quizId, questionIds }
 */
require('dotenv').config({ path: 'server/.env' })
const mongoose = require('mongoose')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const User = require('../models/User')
const Competency = require('../models/Competency')

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kaushalai')

  const user = await User.findOne({ email: 'test.officer@mospi.gov.in' }).lean()
  if (!user) throw new Error('Seed user test.officer@mospi.gov.in not found — run the main seed first')

  const surveyComp = await Competency.findOne({ name: 'Survey Design' }).lean()
  const pythonComp = await Competency.findOne({ name: 'Python for Data Analysis' }).lean()

  // Remove previous test quiz so this script is idempotent
  const existing = await Quiz.findOne({ materialId: 'test-material-stage8' })
  if (existing) {
    await Question.deleteMany({ quizId: existing._id })
    await Quiz.deleteOne({ _id: existing._id })
  }

  const quiz = await Quiz.create({
    title: 'Statistical Methods Assessment',
    materialId: 'test-material-stage8',
    createdBy: user._id,
    questionCount: 5,
    tagCompetencyIds: [surveyComp._id, pythonComp._id],
  })

  const questions = await Question.insertMany([
    {
      quizId: quiz._id,
      questionText: 'What is stratified random sampling?',
      options: ['A random walk process', 'Divides population into strata and samples each', 'Sampling with replacement', 'Cluster-based selection'],
      correctOptionIndex: 1,
      explanation: 'Stratified sampling divides the population into homogeneous subgroups and samples each proportionally.',
      difficulty: 'medium',
    },
    {
      quizId: quiz._id,
      questionText: 'Which Python library is primarily used for tabular data manipulation?',
      options: ['numpy', 'pandas', 'matplotlib', 'scipy'],
      correctOptionIndex: 1,
      explanation: 'pandas provides the DataFrame structure designed for tabular data wrangling.',
      difficulty: 'easy',
    },
    {
      quizId: quiz._id,
      questionText: 'What does NSO stand for in the Indian statistical system?',
      options: ['National Statistics Office', 'National Survey Organisation', 'National Statistical Office', 'None of the above'],
      correctOptionIndex: 2,
      explanation: 'NSO = National Statistical Office, the renamed body under MOSPI from 2019.',
      difficulty: 'easy',
    },
    {
      quizId: quiz._id,
      questionText: 'Probability Proportional to Size (PPS) sampling is most appropriate when?',
      options: ['Population unit sizes vary significantly', 'All units are of equal size', 'No sampling frame is available', 'Cost per unit is uniform'],
      correctOptionIndex: 0,
      explanation: 'PPS gives larger units a higher selection probability, improving efficiency when sizes vary.',
      difficulty: 'hard',
    },
    {
      quizId: quiz._id,
      questionText: 'What is the primary purpose of a sampling frame?',
      options: ['Define the estimation target', 'List all units from which a sample is drawn', 'Compute post-stratification weights', 'Choose the estimator formula'],
      correctOptionIndex: 1,
      explanation: 'A sampling frame enumerates all elements in the population eligible for selection.',
      difficulty: 'medium',
    },
  ])

  quiz.questionIds = questions.map((q) => q._id)
  await quiz.save()

  console.log(JSON.stringify({ quizId: quiz._id, questionIds: questions.map((q) => q._id.toString()) }))
  await mongoose.disconnect()
}

main().catch((err) => { console.error(err.message); process.exit(1) })
