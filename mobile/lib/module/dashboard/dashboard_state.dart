abstract class DashboardState {}

class DashboardInitial extends DashboardState {}

class DashboardLoading extends DashboardState {}

class DashboardLoaded extends DashboardState {
  final Map<String, dynamic>? leaveBalance;
  final Map<String, dynamic>? todayAttendance;

  DashboardLoaded({
    this.leaveBalance,
    this.todayAttendance,
  });
}

class DashboardError extends DashboardState {
  final String message;

  DashboardError({required this.message});
}

class DashboardSignOutSuccess extends DashboardState {}
