const pool = require('../models/db');

// ✅ Add new patient — NO timeline stored
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

// ✅ Update patient — NO timeline
const updatePatient = async (req, res) => {
  const { id } = req.params;
  const {
    diagnosis, observations, prescriptions,
    action, status, doctor_name, discharge_date
  } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (diagnosis !== undefined) {
      fields.push(`diagnosis = $${idx++}`);
      values.push(diagnosis);
    }
    if (observations !== undefined) {
      fields.push(`observations = $${idx++}`);
      values.push(observations);
    }
    if (prescriptions !== undefined) {
      fields.push(`prescriptions = $${idx++}`);
      values.push(prescriptions);
    }
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

module.exports = { addPatient, getPatients, updatePatient };
