const { createApp } = require('../server/app');

let appPromise = null;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = createApp();
  }
  
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Serverless Function initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to initialize server', details: error.message }
    });
  }
};
