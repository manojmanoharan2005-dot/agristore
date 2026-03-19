import Razorpay from 'razorpay';

let instance = null;

export const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.replace(/"/g, '');
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.replace(/"/g, '');

  if (!keyId || !keySecret) {
    console.warn('Razorpay keys missing — payments disabled');
    return null;
  }

  if (!instance) {
    instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return instance;
};
