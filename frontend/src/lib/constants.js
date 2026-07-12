// Enums matching backend schema exactly
export const UserRole = {
  FleetManager: 'FleetManager',
  Dispatcher: 'Dispatcher',
  SafetyOfficer: 'SafetyOfficer',
  FinancialAnalyst: 'FinancialAnalyst',
};

export const VehicleStatus = {
  Available: 'Available',
  OnTrip: 'OnTrip',
  InShop: 'InShop',
  Retired: 'Retired',
};

export const DriverStatus = {
  Available: 'Available',
  OnTrip: 'OnTrip',
  OffDuty: 'OffDuty',
  Suspended: 'Suspended',
};

export const TripStatus = {
  Draft: 'Draft',
  Dispatched: 'Dispatched',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

export const MaintenanceLogStatus = {
  Active: 'Active',
  Closed: 'Closed',
};

export const ExpenseType = {
  Toll: 'Toll',
  Other: 'Other',
};

// Human-readable role labels
export const ROLE_LABELS = {
  [UserRole.FleetManager]: 'Fleet Manager',
  [UserRole.Dispatcher]: 'Dispatcher',
  [UserRole.SafetyOfficer]: 'Safety Officer',
  [UserRole.FinancialAnalyst]: 'Financial Analyst',
};

// Badge color config: { bg, text, dot }
export const VEHICLE_STATUS_COLORS = {
  [VehicleStatus.Available]: { bg: 'bg-status-available-bg', text: 'text-status-available', dot: 'bg-status-available' },
  [VehicleStatus.OnTrip]:    { bg: 'bg-status-ontrip-bg',    text: 'text-status-ontrip',    dot: 'bg-status-ontrip' },
  [VehicleStatus.InShop]:    { bg: 'bg-status-inshop-bg',    text: 'text-status-inshop',    dot: 'bg-status-inshop' },
  [VehicleStatus.Retired]:   { bg: 'bg-status-retired-bg',   text: 'text-status-retired',   dot: 'bg-status-retired' },
};

export const DRIVER_STATUS_COLORS = {
  [DriverStatus.Available]:  { bg: 'bg-status-available-bg', text: 'text-status-available', dot: 'bg-status-available' },
  [DriverStatus.OnTrip]:     { bg: 'bg-status-ontrip-bg',    text: 'text-status-ontrip',    dot: 'bg-status-ontrip' },
  [DriverStatus.OffDuty]:    { bg: 'bg-status-offduty-bg',   text: 'text-status-offduty',   dot: 'bg-status-offduty' },
  [DriverStatus.Suspended]:  { bg: 'bg-status-suspended-bg', text: 'text-status-suspended', dot: 'bg-status-suspended' },
};

export const TRIP_STATUS_COLORS = {
  [TripStatus.Draft]:      { bg: 'bg-status-draft-bg',      text: 'text-status-draft',      dot: 'bg-status-draft' },
  [TripStatus.Dispatched]: { bg: 'bg-status-dispatched-bg', text: 'text-status-dispatched', dot: 'bg-status-dispatched' },
  [TripStatus.Completed]:  { bg: 'bg-status-completed-bg',  text: 'text-status-completed',  dot: 'bg-status-completed' },
  [TripStatus.Cancelled]:  { bg: 'bg-status-cancelled-bg',  text: 'text-status-cancelled',  dot: 'bg-status-cancelled' },
};

// Navigation items per role
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    roles: [UserRole.FleetManager, UserRole.Dispatcher, UserRole.SafetyOfficer, UserRole.FinancialAnalyst],
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    roles: [UserRole.FleetManager, UserRole.Dispatcher, UserRole.SafetyOfficer, UserRole.FinancialAnalyst],
  },
  {
    label: 'Drivers',
    path: '/drivers',
    roles: [UserRole.FleetManager, UserRole.Dispatcher, UserRole.SafetyOfficer, UserRole.FinancialAnalyst],
  },
  {
    label: 'Trips',
    path: '/trips',
    roles: [UserRole.FleetManager, UserRole.Dispatcher, UserRole.SafetyOfficer, UserRole.FinancialAnalyst],
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    roles: [UserRole.FleetManager],
  },
  {
    label: 'Fuel & Expenses',
    path: '/fuel-expenses',
    roles: [UserRole.FinancialAnalyst],
  },
  {
    label: 'Analytics',
    path: '/analytics',
    roles: [UserRole.FinancialAnalyst],
  },
];
