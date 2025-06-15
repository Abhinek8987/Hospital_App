const pool = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ✅ Register user (doctor or nurse)
const registerUser = async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, hashedPassword, name, role]
    );

    res.status(201).json({
      message: 'User registered',
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        name: result.rows[0].name,
        role: result.rows[0].role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ✅ Login user
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret', // fallback for dev
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = { registerUser, loginUser };
