'use strict'

const mongoose = require('mongoose')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const User = require('../models/User')

const OFFICIAL_QUIZZES_DATA = [
  {
    materialId: 'quiz-data-analysis-02',
    title: 'Data Analysis with Python & Pandas',
    domain: 'Data Management',
    difficulty: 'Intermediate',
    durationMinutes: 25,
    passScorePercent: 70,
    questions: [
      {
        questionText: 'Which function in Pandas is primarily used to import tabular data from comma-separated files into a DataFrame?',
        options: ['read_csv()', 'load_csv()', 'import_csv()', 'scan_csv()'],
        correctOptionIndex: 0,
        explanation: 'Pandas read_csv() loads tabular data from delimiter-separated files into a 2-dimensional DataFrame structure with automatic type inference.',
        difficulty: 'easy',
      },
      {
        questionText: 'What attribute returns a tuple containing the number of rows and columns in a DataFrame?',
        options: ['df.dim', 'df.size', 'df.shape', 'df.length'],
        correctOptionIndex: 2,
        explanation: 'df.shape returns (n_rows, n_columns) reflecting the dimensions of the DataFrame array.',
        difficulty: 'easy',
      },
      {
        questionText: 'Which method creates an independent deep copy of an existing DataFrame to prevent SettingWithCopyWarning?',
        options: ['df.clone()', 'df.copy(deep=True)', 'df.duplicate()', 'df.replicate()'],
        correctOptionIndex: 1,
        explanation: 'df.copy(deep=True) duplicates both the data array and indices so modifications do not propagate to the parent slice.',
        difficulty: 'medium',
      },
      {
        questionText: 'What parameter in df.head() determines the number of initial rows displayed?',
        options: ['n', 'count', 'limit', 'rows'],
        correctOptionIndex: 0,
        explanation: 'head(n=5) accepts the parameter n which defaults to 5 rows.',
        difficulty: 'easy',
      },
      {
        questionText: 'How do you rename existing DataFrame columns using a key-value dictionary mapping in Pandas?',
        options: ['df.set_column_names()', 'df.rename(columns={...})', 'df.alter_columns()', 'df.relabel()'],
        correctOptionIndex: 1,
        explanation: 'rename(columns={old_name: new_name}) transforms DataFrame axis labels safely.',
        difficulty: 'medium',
      },
      {
        questionText: 'Which operator or accessor performs label-based indexing to retrieve rows and columns by their textual labels?',
        options: ['.iloc[]', '.loc[]', '.at_index[]', '.filter_label[]'],
        correctOptionIndex: 1,
        explanation: '.loc[] accesses rows and columns by label strings or boolean vectors.',
        difficulty: 'easy',
      },
      {
        questionText: 'Which Pandas function is used to remove missing NaN values from a DataFrame?',
        options: ['dropna()', 'fillna()', 'null()', 'remove_nulls()'],
        correctOptionIndex: 0,
        explanation: 'dropna() filters out rows or columns containing missing/NaN values along specified axes.',
        difficulty: 'easy',
      },
      {
        questionText: 'How do you replace missing NaN values with zero in a DataFrame named df in Pandas?',
        options: ['df.dropna(value=0)', 'df.fillna(0)', 'df.replace_null(0)', 'df.impute_zeros()'],
        correctOptionIndex: 1,
        explanation: 'df.fillna(0) replaces all NA/NaN missing values in the DataFrame with the specified value 0.',
        difficulty: 'easy',
      },
      {
        questionText: 'Which method calculates summary statistics (mean, std, min, quartiles, max) for numeric columns in a DataFrame?',
        options: ['df.summary()', 'df.info()', 'df.describe()', 'df.aggregate_stats()'],
        correctOptionIndex: 2,
        explanation: 'df.describe() generates descriptive summary statistics including count, mean, standard deviation, and percentiles.',
        difficulty: 'easy',
      },
      {
        questionText: 'What is the primary architectural difference between df.merge() and df.concat() in Pandas?',
        options: ['merge() performs relational joins on key columns; concat() stacks DataFrames along an axis', 'concat() only works on rows; merge() only works on columns', 'There is no difference; they are aliases', 'merge() creates a view; concat() always creates a deep copy'],
        correctOptionIndex: 0,
        explanation: 'merge() provides SQL-style relational database joins on key columns, whereas concat() stitches DataFrames along axis 0 or 1.',
        difficulty: 'hard',
      },
      {
        questionText: 'A groupby object in Pandas is evaluated lazily until an aggregation function like sum() or mean() is called.',
        options: ['True', 'False', 'Only in debug mode', 'Only for numeric types'],
        correctOptionIndex: 0,
        explanation: 'True: groupby() creates a lazy DataFrameGroupBy instance that does not compute values until an aggregation function is applied.',
        difficulty: 'medium',
      },
      {
        questionText: 'Which accessor is used in Pandas for 0-indexed integer-location based row and column selection?',
        options: ['.loc[]', '.iloc[]', '.ix[]', '.int_pos[]'],
        correctOptionIndex: 1,
        explanation: '.iloc[] selects rows and columns strictly by their numerical 0-based positions.',
        difficulty: 'easy',
      },
    ],
  },
  {
    materialId: 'quiz-stat-methods-01',
    title: 'Survey Design & Sampling Methods Assessment',
    domain: 'Statistical Methods',
    difficulty: 'Intermediate',
    durationMinutes: 30,
    passScorePercent: 70,
    questions: [
      {
        questionText: 'What is the primary purpose of stratified random sampling in official government statistical surveys?',
        options: ['To reduce field enumeration cost', 'To ensure proportional representation of distinct subgroups in the target population', 'To eliminate non-sampling errors completely', 'To speed up tabulation without variance weighting'],
        correctOptionIndex: 1,
        explanation: 'Stratified sampling divides heterogeneous populations into homogeneous strata, guaranteeing representation across sub-cadres or regions.',
        difficulty: 'medium',
      },
      {
        questionText: 'Which institution in India is primarily responsible for conducting large-scale national multi-subject household sample surveys?',
        options: ['Reserve Bank of India', 'NITI Aayog', 'National Statistical Office (NSO), MoSPI', 'Ministry of Finance'],
        correctOptionIndex: 2,
        explanation: 'The National Statistical Office (NSO) under MoSPI carries out nation-wide socio-economic and enterprise surveys.',
        difficulty: 'easy',
      },
      {
        questionText: 'In survey sampling, what does the Design Effect (DEFF) quantify?',
        options: ['The ratio of variance under cluster sampling compared to simple random sampling (SRS)', 'The percentage of non-response in urban sample blocks', 'The ratio of survey budget to sample size', 'The optimal sample allocation formula'],
        correctOptionIndex: 0,
        explanation: 'DEFF = Var(complex) / Var(SRS). It quantifies the inflation in variance caused by clustering or multi-stage sample designs.',
        difficulty: 'hard',
      },
      {
        questionText: 'In two-stage sampling, Primary Sampling Units (PSUs) in rural areas are typically Census Villages.',
        options: ['True', 'False', 'Only in urban agglomerations', 'Only for agricultural censuses'],
        correctOptionIndex: 0,
        explanation: 'True: In NSO rural surveys, Census villages typically serve as the first-stage primary sampling units.',
        difficulty: 'easy',
      },
      {
        questionText: 'Which formula calculates the sampling weight (multiplier) for an element with selection probability P?',
        options: ['Weight = P * 100', 'Weight = 1 / P', 'Weight = P^2', 'Weight = sqrt(P)'],
        correctOptionIndex: 1,
        explanation: 'The sampling weight is the inverse of the inclusion probability (Weight = 1 / P).',
        difficulty: 'medium',
      },
      {
        questionText: 'Which of the following is categorized as a non-sampling error in survey operations?',
        options: ['Sampling variance', 'Standard error of the mean', 'Interviewer data recording error', 'Sample size degree of freedom'],
        correctOptionIndex: 2,
        explanation: 'Data recording, respondent recall lapses, and data entry errors are non-sampling errors.',
        difficulty: 'easy',
      },
    ],
  },
  {
    materialId: 'quiz-national-accounts-03',
    title: 'National Accounts & GDP Compilation Examination',
    domain: 'Statistical Methods',
    difficulty: 'Advanced',
    durationMinutes: 45,
    passScorePercent: 75,
    questions: [
      {
        questionText: 'Under the System of National Accounts (SNA 2008), how is Gross Value Added (GVA) at basic prices derived from Gross Output?',
        options: ['GVA = Gross Output + Intermediate Consumption', 'GVA = Gross Output - Intermediate Consumption', 'GVA = Net Output + Subsidies', 'GVA = Gross Capital Formation - Taxes'],
        correctOptionIndex: 1,
        explanation: 'GVA at basic prices equals Gross Output minus Intermediate Consumption.',
        difficulty: 'medium',
      },
      {
        questionText: 'What is the current base year for GDP compilation in India as maintained by the National Accounts Division (NAD)?',
        options: ['2004-05', '2011-12', '2015-16', '2018-19'],
        correctOptionIndex: 1,
        explanation: 'The current official national accounts series uses 2011-12 as its base year.',
        difficulty: 'easy',
      },
      {
        questionText: 'GDP at market prices is obtained by adding product taxes and subtracting product subsidies from GVA at basic prices.',
        options: ['True', 'False', 'Only for manufacturing', 'Only at constant prices'],
        correctOptionIndex: 0,
        explanation: 'True: GDP at market prices = GVA at basic prices + Product Taxes - Product Subsidies.',
        difficulty: 'easy',
      },
      {
        questionText: 'Which deflator index is used to convert nominal GDP into real GDP at constant prices?',
        options: ['Consumer Price Index (CPI)', 'Wholesale Price Index (WPI)', 'GDP Deflator (Implicit Price Deflator)', 'Index of Industrial Production (IIP)'],
        correctOptionIndex: 2,
        explanation: 'The Implicit GDP Deflator is the comprehensive measure of price change across all goods and services produced in the economy.',
        difficulty: 'hard',
      },
    ],
  },
  {
    materialId: 'quiz-powerbi-viz-04',
    title: 'Data Visualization & Dashboarding (Power BI)',
    domain: 'Analytical & Technical',
    difficulty: 'Beginner',
    durationMinutes: 20,
    passScorePercent: 65,
    questions: [
      {
        questionText: 'In Power BI, which formula language is used to write calculated columns and measures?',
        options: ['M Query Language', 'DAX (Data Analysis Expressions)', 'T-SQL', 'Python Syntax'],
        correctOptionIndex: 1,
        explanation: 'DAX (Data Analysis Expressions) is the library of functions and operators used to build measures and calculated columns in Power BI.',
        difficulty: 'easy',
      },
      {
        questionText: 'Which Power BI tool is used for data transformation, column pivoting, and ETL before loading into the tabular model?',
        options: ['Power Pivot', 'Power View', 'Power Query Editor', 'Report View'],
        correctOptionIndex: 2,
        explanation: 'Power Query Editor uses M formula language to clean, shape, and transform incoming data sources.',
        difficulty: 'easy',
      },
      {
        questionText: 'Calculated columns in Power BI are computed at query time, whereas measures consume RAM permanently in the data model.',
        options: ['True', 'False', 'Only in DirectQuery mode', 'Only in Power BI Service'],
        correctOptionIndex: 1,
        explanation: 'False: Calculated columns are computed during data refresh and stored in memory; measures are evaluated dynamically at query time.',
        difficulty: 'medium',
      },
    ],
  },
  {
    materialId: 'quiz-cpi-iip-05',
    title: 'Consumer Price Index (CPI) & IIP Compilation',
    domain: 'Domain Knowledge',
    difficulty: 'Intermediate',
    durationMinutes: 30,
    passScorePercent: 70,
    questions: [
      {
        questionText: 'Which index formula is primarily employed in India for compiling the headline Consumer Price Index (CPI)?',
        options: ['Paasche Formula', 'Laspeyres Formula', 'Fisher Ideal Index', 'Marshall-Edgeworth Formula'],
        correctOptionIndex: 1,
        explanation: 'India CPI uses the base-weighted Laspeyres index methodology to measure changes in price levels of a fixed consumption basket.',
        difficulty: 'medium',
      },
      {
        questionText: 'What is the base year for the current Consumer Price Index (Rural/Urban/Combined) series in India?',
        options: ['2010 = 100', '2012 = 100', '2015 = 100', '2020 = 100'],
        correctOptionIndex: 1,
        explanation: 'The current all-India CPI series uses 2012 = 100 as its base period.',
        difficulty: 'easy',
      },
      {
        questionText: 'In the Index of Industrial Production (IIP), which sector carries the highest weight?',
        options: ['Mining', 'Manufacturing', 'Electricity', 'Construction'],
        correctOptionIndex: 1,
        explanation: 'Manufacturing carries the predominant weight (77.63%) in the IIP item basket (base 2011-12).',
        difficulty: 'medium',
      },
    ],
  },
  {
    materialId: 'quiz-data-quality-06',
    title: 'NQAF Data Governance & Quality Standards',
    domain: 'Governance & Quality',
    difficulty: 'Intermediate',
    durationMinutes: 25,
    passScorePercent: 70,
    questions: [
      {
        questionText: 'Under the National Quality Assurance Framework (NQAF), which of the following is an essential quality dimension?',
        options: ['Relevance', 'Accuracy & Reliability', 'Timeliness & Punctuality', 'All of the above'],
        correctOptionIndex: 3,
        explanation: 'NQAF defines Relevance, Accuracy, Timeliness, Accessibility, Clarity, and Comparability as fundamental quality pillars.',
        difficulty: 'easy',
      },
      {
        questionText: 'Under the Digital Personal Data Protection (DPDP) Act 2023, who is the entity determining the purpose and means of personal data processing?',
        options: ['Data Principal', 'Data Fiduciary', 'Data Auditor', 'Consent Manager'],
        correctOptionIndex: 1,
        explanation: 'Under Section 2(i) of the DPDP Act, the Data Fiduciary determines the purpose and means of processing personal data.',
        difficulty: 'medium',
      },
      {
        questionText: 'Official microdata released to researchers must undergo statistical disclosure control (SDC) anonymization.',
        options: ['True', 'False', 'Only for foreign researchers', 'Only for census data'],
        correctOptionIndex: 0,
        explanation: 'True: MoSPI microdata dissemination protocols mandate masking direct identifiers and perturbing sensitive attributes.',
        difficulty: 'easy',
      },
    ],
  },
]

async function seedOfficialQuizzes() {
  try {
    let adminUser = await User.findOne({ role: 'admin' })
    if (!adminUser) {
      adminUser = await User.findOne()
    }
    const adminId = adminUser?._id || new mongoose.Types.ObjectId()

    for (const quizData of OFFICIAL_QUIZZES_DATA) {
      // Find or create quiz
      let quiz = await Quiz.findOne({ materialId: quizData.materialId })

      if (!quiz) {
        quiz = new Quiz({
          title: quizData.title,
          materialId: quizData.materialId,
          questionCount: quizData.questions.length,
          createdBy: adminId,
        })
        await quiz.save()
      }

      // Check if questions already seeded for this quiz
      const existingCount = await Question.countDocuments({ quizId: quiz._id })
      if (existingCount < quizData.questions.length) {
        // Delete old questions if any to avoid duplicates
        await Question.deleteMany({ quizId: quiz._id })

        const createdQuestions = await Question.insertMany(
          quizData.questions.map((q) => ({
            quizId: quiz._id,
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
            difficulty: q.difficulty || 'medium',
          }))
        )

        quiz.questionIds = createdQuestions.map((q) => q._id)
        quiz.questionCount = createdQuestions.length
        await quiz.save()
      }
    }

    console.log(`[seedOfficialQuizzes] Successfully verified and seeded ${OFFICIAL_QUIZZES_DATA.length} official curriculum assessments.`)
  } catch (err) {
    console.warn('[seedOfficialQuizzes] Warning seeding official quizzes:', err.message)
  }
}

module.exports = seedOfficialQuizzes
