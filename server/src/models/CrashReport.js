const mongoose = require('mongoose');

const crashReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, index: true },
    type: { type: String, default: 'error', index: true },
    message: { type: String, required: true },
    stack: { type: String, default: null },
    machineId: { type: String, index: true },
    appVersion: String,
    platform: String,
    arch: String,
    osRelease: String,
    isPackaged: Boolean,
    extra: mongoose.Schema.Types.Mixed,
    clientTime: Date,
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

crashReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CrashReport', crashReportSchema);
