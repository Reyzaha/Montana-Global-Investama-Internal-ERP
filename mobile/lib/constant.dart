// ignore_for_file: constant_identifier_names
enum ApiUrl {
  ACCOUNT('/backend/api/auth/me.php'),
  SIGN_IN('/backend/api/auth/login.php'),
  SIGN_OUT('/backend/api/auth/logout.php'),
  VERIFY_OTP('/backend/api/auth/verify-otp.php'),
  CHANGE_PASSWORD('/backend/api/auth/change-password.php'),

  // Presensi GPS
  ATTENDANCE_SETTINGS('/backend/api/attendance/settings.php'),
  CHECK_IN('/backend/api/attendance/check-in.php'),
  CHECK_OUT('/backend/api/attendance/check-out.php'),
  BREAK_START('/backend/api/attendance/break-start.php'),
  BREAK_END('/backend/api/attendance/break-end.php'),
  MY_ATTENDANCE('/backend/api/attendance/my-attendance.php'),

  // Permit & Cuti
  PERMIT_TYPES('/backend/api/hrga/permit-types.php'),
  PERMIT_SUB_TYPES('/backend/api/hrga/permit-sub-types.php'),
  PERMITS('/backend/api/hrga/permits.php'),
  PERMIT_DETAIL('/backend/api/hrga/permits-detail.php'),
  PERMIT_APPROVE('/backend/api/hrga/permits-approve.php'),
  PERMIT_REJECT('/backend/api/hrga/permits-reject.php'),
  LEAVE_BALANCE('/backend/api/user/leave-balance.php');

  final String path;
  const ApiUrl(this.path);

  static const String MAIN_BASE = 'http://192.168.110.181/Montana-Global-Investama-ERP';
  static const String SECONDARY_BASE = 'http://10.0.2.2/Montana-Global-Investama-ERP';
}

class AppConstants {
  static const String appName = 'MGI ERP Mobile';
  static const String companyName = 'PT Montana Global Investama';
}
