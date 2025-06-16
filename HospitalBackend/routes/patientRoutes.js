const express = require('express');
const router = express.Router();

// ✅ Import controller functions
const {
  addPatient,
  getPatients,
  updatePatient,
  addTimelineEntry,
  getPatientTimeline
} = require('../controllers/patientController');

// ✅ Routes for patient operations
router.post('/', addPatient);                 // Add a new patient
router.get('/', getPatients);                 // Get all patients
router.put('/:id', updatePatient);            // Update a patient by patient_id

// ✅ Routes for patient timeline
router.post('/timeline', addTimelineEntry);           // Add a timeline entry
router.get('/timeline/:patient_db_id', getPatientTimeline);  // Get timeline by DB ID

module.exports = router;
