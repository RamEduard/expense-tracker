// Require Express and Express router
const express = require('express')
const router = express.Router()

// Require Record and Category model
const Record = require('../../models/record')
const Category = require('../../models/category')

// Set up routes
// Add expense page
router.get('/new', async (req, res) => {
  try {
    // Get category data for category dropdown
    const categories = await Category.find().lean().exec()

    return res.render('new', { categoryList: categories, formCSS: true })
  } catch (err) {
    console.warn(err)
  }
})

// Confirm creation
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id
    // Get form data form request body
    const record = req.body
    // Find category of the record
    const category = await Category.findOne({ name: record.category })
      .lean()
      .exec()

    // Reassign the record's attribute
    record.date = record.date || Date.now()
    record.amount = parseFloat(record.amount)
    record.categoryIcon = category.icon
    record.userId = userId

    // Save the record to Record collection
    const createRecord = await Record.create(record)

    return res.redirect('/')
  } catch (err) {
    console.warn(err)
  }
})

// Edit page
router.get('/:id/edit', async (req, res) => {
  try {
    const userId = req.user._id
    const _id = req.params.id

    // Find the record by _id and userId
    // And get category data
    const [record, categories] = await Promise.all([
      Record.findOne({ _id, userId }).lean().exec(),
      Category.find().lean().exec(),
    ])

    // Save category status of the record for eq function
    categories.forEach(category => {
      category.tempCategory = record.category
    })

    return res.render('edit', {
      record,
      categoryList: categories,
      formCSS: true,
    })
  } catch (err) {
    console.warn(err)
  }
})

// Confirm editing
router.put('/:id', async (req, res) => {
  try {
    // Get user id and record _id
    const userId = req.user._id
    const _id = req.params.id
    // Get form data form request body
    const newRecord = req.body
    // Find the icon info from category collection,
    // and the original record data by _id and userId
    let [category, record] = await Promise.all([
      Category.findOne({ name: newRecord.category }).lean().exec(),
      Record.findOne({ _id, userId }).exec(),
    ])

    // Add icon info to the new record
    newRecord.categoryIcon = category.icon
    // Change amount type from string to number
    newRecord.amount = parseFloat(newRecord.amount)
    // Reassign new record data and save to record collection
    record = Object.assign(record, newRecord)
    const saveRecord = await record.save()

    return res.redirect('/')
  } catch (err) {
    console.warn(err)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id
    const _id = req.params.id
    // Find the record
    const record = await Record.findOne({ _id, userId }).exec()
    // Remove the record from database
    const removeRecord = await record.remove()

    return res.redirect('/')
  } catch (err) {
    console.warn(err)
  }
})

// Filter
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id
    const category = req.query.category
    const date = req.query.date
    const dateSet = new Set()
    let totalAmount = 0

    // Initiate filter variable
    const filter = { userId }
    // If there is no query string, return to home page
    if (!category && !date) return res.redirect('/')
    // Add query string to filter
    if (category) filter.category = category
    if (date) filter.date = new RegExp('^' + date)

    // Find all records of the user,
    // all categories object,
    // and all filtered records
    const [records, categories, filteredRecords] = await Promise.all([
      Record.find({ userId }).lean().sort({ date: 'desc' }).exec(),
      Category.find().lean().exec(),
      Record.find(filter).lean().sort({ date: 'desc' }).exec(),
    ])

    // Iterate over all records,
    // and store different months of years to render year-month filter
    records.forEach(record => {
      dateSet.add(record.date.slice(0, 7))
    })

    // Iterate over filtered records to calculate total amount
    filteredRecords.forEach(record => {
      totalAmount += record.amount
    })
    // Format total amount
    totalAmount = new Intl.NumberFormat().format(totalAmount)

    return res.render('index', {
      records: filteredRecords,
      totalAmount,
      selectCategory: category,
      categoryList: categories,
      selectDate: date,
      dateSet,
      indexCSS: true,
    })
  } catch (err) {
    console.warn(err)
  }
})

// Export router
module.exports = router
