import express from 'express';

/**
 * @desc    Generate emergency shareable message
 * @route   POST /api/emergency/generate-message
 * @access  Private
 */
export const generateEmergencyMessage = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Creating Google Maps link
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    // Creating the emergency message text
    const emergencyMessage = `🚨 URGENT: I am having a glucose emergency and need immediate assistance! Here is my current live location: ${mapsLink}`;

    res.status(200).json({
      success: true,
      message: 'Emergency message generated successfully',
      data: {
        shareableText: emergencyMessage,
        mapsLink
      }
    });

  } catch (error) {
    console.error('Error generating emergency message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating emergency message'
    });
  }
};
