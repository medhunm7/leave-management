import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Leave from './models/Leave.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

// CORS setup
app.use(
  cors({
    origin: CLIENT_URL && CLIENT_URL !== '*' ? [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'] : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

let memoryLeaves = [
  {
    _id: 'demo-1',
    employeeName: 'Arun Kumar',
    employeeId: 'EMP001',
    department: 'Information Technology',
    leaveType: 'Casual Leave',
    startDate: '2026-11-02',
    endDate: '2026-11-03',
    reason: 'Personal work',
    status: 'Pending',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'demo-2',
    employeeName: 'Priya S',
    employeeId: 'EMP002',
    department: 'Human Resources',
    leaveType: 'Sick Leave',
    startDate: '2026-10-20',
    endDate: '2026-10-21',
    reason: 'Not feeling well',
    status: 'Approved',
    createdAt: new Date().toISOString()
  }
];
let mongoReady = false;

async function connectMongo() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_username>')) {
    console.log('ℹ️ MONGO_URI not configured or contains placeholder. Using resilient in-memory storage.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    mongoReady = true;
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.warn(`⚠️ MongoDB unavailable (${err.message}). Using resilient in-memory data.`);
  }
}

const allLeaves = async () => (mongoReady ? Leave.find().sort({ createdAt: -1 }) : memoryLeaves);
const findLeave = async (id) => (mongoReady ? Leave.findById(id) : memoryLeaves.find((x) => x._id === id));

// Health Checks
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'OK', database: mongoReady ? 'MongoDB' : 'In-memory demo mode' })
);

app.get('/api/health', (_req, res) =>
  res.status(200).json({ status: 'OK', ok: true, database: mongoReady ? 'MongoDB' : 'In-memory demo mode' })
);

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'Leave Management API is operational' });
});

// GET /api/leaves
app.get('/api/leaves', async (_req, res) => {
  try {
    res.json(await allLeaves());
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ message: 'Could not load leave requests.' });
  }
});

// POST /api/leaves
app.post('/api/leaves', async (req, res) => {
  const { employeeName, employeeId, department, leaveType, startDate, endDate, reason } = req.body;
  if (
    ![employeeName, employeeId, department, leaveType, startDate, endDate, reason].every(
      (v) => typeof v === 'string' && v.trim()
    )
  ) {
    return res.status(400).json({ message: 'Please fill in every field.' });
  }
  if (endDate < startDate) {
    return res.status(400).json({ message: 'End date must be on or after start date.' });
  }

  try {
    const data = {
      employeeName: employeeName.trim(),
      employeeId: employeeId.trim(),
      department: department.trim(),
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      status: 'Pending'
    };

    if (mongoReady) {
      const created = await Leave.create(data);
      return res.status(201).json(created);
    }

    const created = {
      ...data,
      _id: `mem-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    memoryLeaves.unshift(created);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating leave:', err);
    res.status(500).json({ message: 'Could not submit the request.' });
  }
});

// PATCH /api/leaves/:id/status
app.patch('/api/leaves/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    let updated;
    if (mongoReady) {
      updated = await Leave.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );
    } else {
      const leave = memoryLeaves.find((x) => x._id === req.params.id);
      if (leave) {
        leave.status = status;
        updated = leave;
      }
    }

    if (!updated) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ message: 'Could not update the request.' });
  }
});

// DELETE /api/leaves/:id
app.delete('/api/leaves/:id', async (req, res) => {
  try {
    let deleted;
    if (mongoReady) {
      deleted = await Leave.findByIdAndDelete(req.params.id);
    } else {
      const index = memoryLeaves.findIndex((x) => x._id === req.params.id);
      if (index !== -1) {
        deleted = memoryLeaves.splice(index, 1)[0];
      }
    }

    if (!deleted) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }
    res.json({ message: 'Leave request deleted.' });
  } catch (err) {
    console.error('Error deleting leave:', err);
    res.status(500).json({ message: 'Could not delete the request.' });
  }
});

// Start Server
connectMongo().finally(() => {
  app.listen(PORT, () => console.log(`🚀 API server running at http://localhost:${PORT}`));
});
