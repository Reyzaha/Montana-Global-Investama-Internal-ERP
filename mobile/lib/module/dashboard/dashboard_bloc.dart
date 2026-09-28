import "package:flutter_bloc/flutter_bloc.dart";
import "package:jiffy/jiffy.dart";
import "../../api/api_manager.dart";
import "../../auth_service.dart";
import "../../helper/generals.dart";
import "dashboard_event.dart";
import "dashboard_state.dart";

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  DashboardBloc() : super(DashboardInitial()) {
    on<DashboardFetchData>((event, emit) async {
      emit(DashboardLoading());

      Map<String, dynamic>? leaveBalance;
      Map<String, dynamic>? todayAttendance;

      try {
        // 1. Ambil kuota cuti
        final balanceRes = await ApiManager.getLeaveBalance();
        if (balanceRes.data != null && balanceRes.data['success'] == true) {
          leaveBalance = balanceRes.data['data'];
        }

        // 2. Ambil presensi hari ini
        final now = DateTime.now();
        final attRes = await ApiManager.getMyAttendance(month: now.month, year: now.year);
        if (attRes.data != null && attRes.data['success'] == true) {
          final List records = attRes.data['data']?['records'] ?? [];
          final todayStr = Jiffy.now().format(pattern: 'yyyy-MM-dd');
          for (var r in records) {
            if (r['date'] == todayStr) {
              todayAttendance = r;
              break;
            }
          }
        }

        emit(DashboardLoaded(
          leaveBalance: leaveBalance,
          todayAttendance: todayAttendance,
        ));
      } catch (e) {
        emit(DashboardError(message: e.toString()));
      }
    });

    on<DashboardSignOut>((event, emit) async {
      await AuthService.signOut();
      await Generals.signOut(null);
      emit(DashboardSignOutSuccess());
    });
  }
}
