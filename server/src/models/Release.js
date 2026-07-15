const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      enum: ['windows', 'linux', 'linux-deb', 'mac-arm64', 'mac-x64', 'mac', 'other'],
    },
    name: { type: String, default: '' },
    arch: { type: String, default: '' },
    label: { type: String, default: '' },
    fileName: { type: String, default: '' },
    note: { type: String, default: '' },
    /** Public or CDN URL used by website download buttons */
    downloadUrl: { type: String, default: '' },
    /** R2 object key if hosted on Cloudflare R2 */
    r2Key: { type: String, default: '' },
    size: { type: Number, default: 0 },
    sha512: { type: String, default: '' },
  },
  { _id: false },
);

const releaseSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // 1.0.1 or v1.0.1
    },
    title: { type: String, default: '' },
    notes: { type: String, default: '' },
    /** Show this release’s installers on Next.js home download section */
    isHome: { type: Boolean, default: false, index: true },
    /** Old / superseded release — listed on /releases history page */
    isOutdated: { type: Boolean, default: false, index: true },
    /** Soft-hide from public APIs */
    isPublished: { type: Boolean, default: true, index: true },
    platforms: { type: [platformSchema], default: [] },
    publishedAt: { type: Date, default: Date.now },
    changelog: { type: [String], default: [] },
  },
  { timestamps: true },
);

releaseSchema.index({ isHome: 1, isOutdated: 1, publishedAt: -1 });

module.exports = mongoose.model('Release', releaseSchema);
