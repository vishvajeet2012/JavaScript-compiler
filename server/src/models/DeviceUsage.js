const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    startedAt: { type: Date },
    endedAt: { type: Date, default: null },
    durationMs: { type: Number, default: 0 },
    activeMs: { type: Number, default: 0 },
    runCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    stopCount: { type: Number, default: 0 },
    deleteCount: { type: Number, default: 0 },
    folderCount: { type: Number, default: 0 },
    activateCount: { type: Number, default: 0 },
    isPro: { type: Boolean, default: false },
    appVersion: String,
    platform: String,
    payload: mongoose.Schema.Types.Mixed,
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    sessionId: String,
    type: { type: String, required: true },
    payload: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * One document per machine/device — accumulates sessions + events + totals
 */
const deviceUsageSchema = new mongoose.Schema(
  {
    machineId: { type: String, required: true, unique: true, index: true },
    appVersion: String,
    platform: String,
    arch: String,
    osRelease: String,
    hostname: String,
    locale: String,
    isPro: { type: Boolean, default: false },
    activationKey: { type: String, default: null },
    snippetCount: { type: Number, default: 0 },
    folderCount: { type: Number, default: 0 },

    // Aggregates
    totalSessions: { type: Number, default: 0 },
    totalDurationMs: { type: Number, default: 0 },
    totalActiveMs: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalSaves: { type: Number, default: 0 },
    totalStops: { type: Number, default: 0 },
    totalDeletes: { type: Number, default: 0 },
    totalActivations: { type: Number, default: 0 },

    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date, default: Date.now },

    // System-level protection / kill-switch (admin controlled)
    blocked: { type: Boolean, default: false, index: true },
    forceQuit: { type: Boolean, default: false },
    revokePro: { type: Boolean, default: false },
    blockReason: { type: String, default: '' },
    blockedAt: { type: Date, default: null },
    minVersion: { type: String, default: null },

    sessions: { type: [sessionSchema], default: [] },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true }
);

// Cap array growth
deviceUsageSchema.pre('save', function capArrays(next) {
  if (this.sessions && this.sessions.length > 500) {
    this.sessions = this.sessions.slice(-500);
  }
  if (this.events && this.events.length > 2000) {
    this.events = this.events.slice(-2000);
  }
  next();
});

module.exports = mongoose.model('DeviceUsage', deviceUsageSchema);
