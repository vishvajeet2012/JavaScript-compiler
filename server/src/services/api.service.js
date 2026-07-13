/**
 * API Service — Business logic layer
 * Keeps controllers thin by moving logic here
 */

/**
 * Get application info
 * @returns {Object} Application metadata
 */
const getAppInfo = () => {
  return {
    name: 'Landing Page API',
    version: '1.0.0',
    description: 'Backend API for Next.js landing page',
    author: 'Vishu',
    endpoints: {
      health: 'GET /api/v1/health',
      info: 'GET /api/v1/info',
      contact: 'POST /api/v1/contact',
    },
  };
};

/**
 * Process a contact form submission
 * In production, this would save to DB and/or send an email
 *
 * @param {Object} contactData - The contact form data
 * @param {string} contactData.name - Sender name
 * @param {string} contactData.email - Sender email
 * @param {string} contactData.message - Message body
 * @returns {Object} Processed contact data with metadata
 */
const processContactForm = async ({ name, email, message }) => {
  // TODO: Save to database
  // const contact = await ContactModel.create({ name, email, message });

  // TODO: Send notification email
  // await emailService.sendNotification({ name, email, message });

  // Simulate processing delay in development
  // await new Promise((resolve) => setTimeout(resolve, 100));

  const submission = {
    id: `contact_${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
    submittedAt: new Date().toISOString(),
  };

  console.log(`[SERVICE] New contact submission: ${submission.id} from ${submission.email}`);

  return submission;
};

module.exports = {
  getAppInfo,
  processContactForm,
};
