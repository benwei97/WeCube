const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.sendPushNotification = onDocumentCreated("messages/{messageId}", async (event) => {
  // event.data is a Firestore DocumentSnapshot
  const messageData = event.data.data();
  const messageId = event.params.messageId;
  const recipientId = messageData.recipientId;

  // Retrieve the recipient's push token from Firestore
  const userDoc = await admin.firestore().collection("users").doc(recipientId).get();
  const pushToken = userDoc.data() ? userDoc.data().pushToken : null;
  if (!pushToken) {
    logger.info("No push token for user:", recipientId);
    return;
  }

  // Build the notification payload
  const payload = {
    to: pushToken,
    sound: "default",
    title: "New Message",
    body: messageData.message, // Optionally, include a snippet of the message
    data: {
      messageId: messageId,
      senderId: messageData.senderId,
    },
  };

  // Send the notification using Expo's push notification service
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    logger.info("Push notification response:", data);
  } catch (error) {
    logger.error("Error sending push notification:", error);
  }
});
