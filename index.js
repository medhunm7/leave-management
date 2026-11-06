import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Leave from './models/Leave.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let memoryLeaves = [
  {
    _id: 'demo-1', employeeName: 'Arun Kumar', employeeId: 'EMP001',
    department: 'Information Technology', leaveType: 'Casual Leave',
    startDate: '2026-11-02', endDate: '2026-11-03',
    reason: 'Personal work', status: 'Pending', createdAt: new Date().toISOString()
  },
  {
    _id: 'demo-2', employeeName: 'Priya S', employeeId: 'EMP002',
    department: 'Human Resources', leaveType: 'Sick Leave',
    startDate: '2026-10-20', endDate: '2026-10-21',
    reason: 'Not feeling well', status: 'Approved', createdAt: new Date().toISOString()
  }
];
let mongoReady = false;

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('MONGO_URI not set. Using temporary in-memory data.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    mongoReady = true;
    console.log('MongoDB connected.');
  } catch (err) {
    console.warn(`MongoDB unavailable (${err.message}). Using temporary in-memory data.`);
  }
}
const allLeaves = async () => mongoReady ? Leave.find().sort({ createdAt: -1 }) : memoryLeaves;
const findLeave = async (id) => mongoReady ? Leave.findById(id) : memoryLeaves.find(x => x._id === id);

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoReady ? 'MongoDB' : 'In-memory demo mode' }));

app.get('/api/leaves', async (_req, res) => {
  try { res.json(await allLeaves()); }
  catch (err) { res.status(500).json({ message: 'Could not load leave requests.' }); }
});

app.post('/api/leaves', async (req, res) => {
  const { employeeName, employeeId, department, leaveType, startDate, endDate, reason } = req.body;
  if (![employeeName, employeeId, department, leaveType, startDate, endDate, reason].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ message: 'Please fill in every field.' });
  }
  if (endDate < startDate) return res.status(400).json({ message: 'End date must be on or after start date.' });
  try {
    const data = { employeeName, employeeId, department, leaveType, startDate, endDate, reason, status: 'Pending' };
    const created = mongoReady ? await Leave.create(data) : { ...data, _id: `mem-${Date.now()}`, createdAt: new Date().toISOString() };
    if (!mongoReady) memoryLeaves.unshift(created);
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ message: 'Could not submit the request.' }); }
});

app.patch('/api/leaves/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    let updated;
    if (mongoReady) updated = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    else {
      const leave = memoryLeaves.find(x => x._id === req.params.id);
      if (leave) { leave.status = status; updated = leave; }
    }
    if (!updated) return res.status(404).json({ message: 'Leave request not found.' });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: 'Could not update the request.' }); }
});

app.delete('/api/leaves/:id', async (req, res) => {
  try {
    let deleted;
    if (mongoReady) deleted = await Leave.findByIdAndDelete(req.params.id);
    else {
      const index = memoryLeaves.findIndex(x => x._id === req.params.id);
      if (index !== -1) deleted = memoryLeaves.splice(index, 1)[0];
    }
    if (!deleted) return res.status(404).json({ message: 'Leave request not found.' });
    res.json({ message: 'Leave request deleted.' });
  } catch (err) { res.status(500).json({ message: 'Could not delete the request.' }); }
});

const port = process.env.PORT || 5000;
connectMongo().finally(() => app.listen(port, () => console.log(`API server running at http://localhost:${port}`)));
