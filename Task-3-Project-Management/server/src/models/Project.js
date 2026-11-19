import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
      },
    ],
    status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
