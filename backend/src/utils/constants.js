export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ROLES = ['patient', 'donor', 'hospital', 'organization', 'admin'];
export const REQUEST_STATUS = ['Pending', 'Accepted', 'In-Transit', 'Fulfilled', 'Cancelled'];
export const COOLDOWN_DAYS = 90;
// Donor -> compatible recipient groups
export const CAN_DONATE_TO = {
  'O-': BLOOD_GROUPS, 'O+': ['O+', 'A+', 'B+', 'AB+'], 'A-': ['A-', 'A+', 'AB-', 'AB+'], 'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'], 'B+': ['B+', 'AB+'], 'AB-': ['AB-', 'AB+'], 'AB+': ['AB+'],
};
