// Values used in many places of the app.

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Bootstrap badge colour for each request status
export const STATUS_COLOR = {
  Pending: 'warning',
  Accepted: 'info',
  'In-Transit': 'primary',
  Fulfilled: 'success',
  Cancelled: 'secondary',
};

// Backend addresses come from the .env file
export const API_URL = process.env.REACT_APP_API_URL;
export const SERVER_URL = process.env.REACT_APP_SERVER_URL;
