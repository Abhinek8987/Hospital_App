const express = require('express');
const router = express.Router();

// ✅ Import controller functions
const {
  addPatient,
  getPatients,
  updatePatient,
  getPatientTimeline // ✅ New: import timeline controller
} = require('../controllers/patientController');

// ✅ Routes
router.post('/', addPatient);              // Nurse adds a patient
router.get('/', getPatients);              // Fetch all patients
router.put('/:id', updatePatient);         // Doctor updates patient info (diagnosis, prescription, etc.)

module.exports = router;
