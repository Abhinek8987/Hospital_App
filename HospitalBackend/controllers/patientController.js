const pool = require('../models/db');

// ✅ Add a new patient
const addPatient = async (req, res) => {
  const {
    name, age, symptoms, condition, status,
    emergency_contact, insurance_provider, policy_number,
    doctor_id, patient_id
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO patients 
        (name, age, symptoms, condition, status, emergency_contact,
         insurance_provider, policy_number, doctor_id, patient_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [name, age, symptoms, condition, status, emergency_contact,
       insurance_provider, policy_number, doctor_id, patient_id]
    );

    res.status(201).json({
      message: 'Patient registered',
      patient: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error saving patient:', err.message);
    res.status(500).json({ error: 'Failed to register patient' });
  }
};

// ✅ Get all patients
const getPatients = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM patients ORDER BY updated_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching patients:', err.message);
    res.status(500).json({ error: 'Failed to get patients' });
  }
};

// ✅ Update patient info
const updatePatient = async (req, res) => {
  const { id } = req.params;
  const {
    diagnosis, observations, prescriptions,
    action, status, doctor_name, discharge_date
  } = req.body;

  try {
    const current = await pool.query(
      `SELECT * FROM patients WHERE patient_id = $1`,
      [id]
    );

    if (current.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const existing = current.rows[0];

    const fields = [];
    const values = [];
    let idx = 1;

    fields.push(`diagnosis = $${idx++}`);
    values.push(diagnosis !== undefined ? diagnosis : existing.diagnosis);

    fields.push(`observations = $${idx++}`);
    values.push(observations !== undefined ? observations : existing.observations);

    fields.push(`prescriptions = $${idx++}`);
    values.push(prescriptions !== undefined ? prescriptions : existing.prescriptions);

    if (action !== undefined) {
      fields.push(`action = $${idx++}`);
      values.push(action);
    }

    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }

    if (doctor_name !== undefined) {
      fields.push(`doctor_name = $${idx++}`);
      values.push(doctor_name);
    }

    if (discharge_date !== undefined) {
      fields.push(`discharge_date = $${idx++}`);
      values.push(discharge_date);
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const query = `
      UPDATE patients SET ${fields.join(', ')}
      WHERE patient_id = $${idx}
      RETURNING *`;

    values.push(id);

    const result = await pool.query(query, values);

    res.json({ message: 'Patient updated', patient: result.rows[0] });
  } catch (err) {
    console.error('❌ Error updating patient:', err.message);
    res.status(500).json({ error: 'Failed to update patient' });
  }
};

// ✅ Add timeline entry
const addTimelineEntry = async (req, res) => {
  const {
    patient_db_id,
    action,
    performed_by,
    notes,
    medications,
    tests,
    specialist
  } = req.body;

  try {
    const dbId = parseInt(patient_db_id);
    if (isNaN(dbId)) {
      return res.status(400).json({ error: 'Invalid patient_db_id format' });
    }

    const previousRes = await pool.query(
      `SELECT * FROM patient_timeline
       WHERE patient_db_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [dbId]
    );

    const previous = previousRes.rows[0] || {};

    const finalNotes =
      notes !== undefined && notes !== null && notes !== ''
        ? notes
        : previous?.notes;

    const finalMeds =
      medications !== undefined && medications !== null && medications !== ''
        ? medications
        : previous?.medications;

    const finalTests =
      tests !== undefined && tests !== null && tests !== ''
        ? tests
        : previous?.tests;

    const finalSpecialist =
      specialist !== undefined && specialist !== null && specialist !== ''
        ? specialist
        : previous?.specialist;

    const result = await pool.query(
      `INSERT INTO patient_timeline
        (patient_db_id, action, performed_by, notes, medications, tests, specialist)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dbId,
        action,
        performed_by,
        finalNotes || null,
        finalMeds || null,
        finalTests || null,
        finalSpecialist || null
      ]
    );

    console.log("✅ Timeline entry saved:", result.rows[0]);

    res.status(201).json({ message: 'Timeline entry added', entry: result.rows[0] });
  } catch (err) {
    console.error("❌ Failed to add timeline entry:", err.message);
    res.status(500).json({ error: 'Failed to save timeline entry' });
  }
};

// ✅ Get patient timeline (missing before, now fixed)
const getPatientTimeline = async (req, res) => {
  const { patient_db_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM patient_timeline
       WHERE patient_db_id = $1
       ORDER BY timestamp ASC`,
      [patient_db_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching timeline:', err.message);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
};

module.exports = {
  addPatient,
  getPatients,
  updatePatient,
  addTimelineEntry,
  getPatientTimeline // ✅ This is now properly defined
};
