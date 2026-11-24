// src/models/Feedback.js
export function createFeedback({
    feedbackId,
    rating,
    message,
    orderId,
    customerId,
    customerName,
    createdAt = new Date().toISOString(),
  }) {
    return {
      feedbackId,
      rating: Number(rating),
      message,
      createdAt,
      orderId,
      customerId,
      customerName,
    };
  }
  
  export function getSummary(feedback) {
    return `${feedback.rating}/5 - ${feedback.message}`;
  }