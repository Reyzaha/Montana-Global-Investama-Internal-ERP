import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:jiffy/jiffy.dart';
import '../../api/model/account.dart';
import '../../helper/dialogs.dart';
import '../../helper/formats.dart';
import '../../helper/navigators.dart';
import '../../overlay/base_overlays.dart';
import '../attendance/attendance_view.dart';
import '../hrga/hrga_permit_review_view.dart';
import '../hrga/hrga_sub_permits_view.dart';
import '../permit/permit_create_view.dart';
import '../permit/permit_list_view.dart';
import '../sign_in/sign_in_view.dart';
import 'dashboard_bloc.dart';
import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardView extends StatelessWidget {
  final Account account;

  const DashboardView({super.key, required this.account});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<DashboardBloc>(
      create: (_) => DashboardBloc()..add(DashboardFetchData()),
      child: _DashboardContent(account: account),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  final Account account;

  const _DashboardContent({required this.account});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 11) {
      return 'Selamat Pagi,';
    } else if (hour < 15) {
      return 'Selamat Siang,';
    } else if (hour < 18) {
      return 'Selamat Sore,';
    } else {
      return 'Selamat Malam,';
    }
  }

  void _handleSignOut(BuildContext context) {
    Dialogs.confirmation(
      context: context,
      title: 'Keluar dari Akun ERP',
      message: 'Apakah Anda yakin ingin keluar dari sistem MGI ERP?',
      negative: 'Batal',
      positive: 'Keluar',
      positiveCallback: () {
        context.read<DashboardBloc>().add(DashboardSignOut());
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final nowJiffy = Jiffy.now();
    final todayFormatted = Formats.date(jiffy: nowJiffy, defaultString: nowJiffy.format(pattern: 'd MMM yyyy'));

    return BlocConsumer<DashboardBloc, DashboardState>(
      listener: (context, state) {
        if (state is DashboardSignOutSuccess) {
          BaseOverlays.success(message: 'Anda telah berhasil keluar dari akun.');
          Navigators.pushAndRemoveAll(const SignInView());
        } else if (state is DashboardError) {
          BaseOverlays.error(message: 'Gagal memperbarui data: ${state.message}');
        }
      },
      builder: (context, state) {
        final isLoading = state is DashboardLoading;
        final leaveBalance = state is DashboardLoaded ? state.leaveBalance : null;
        final todayAttendance = state is DashboardLoaded ? state.todayAttendance : null;

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: const Color(0xFF1E3A8A),
            elevation: 0,
            title: const Row(
              children: [
                Icon(Icons.corporate_fare_rounded, size: 22, color: Colors.white),
                SizedBox(width: 8),
                Text(
                  'MGI ERP Mobile',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
            actions: [
              IconButton(
                tooltip: 'Keluar',
                icon: const Icon(Icons.logout_rounded, color: Colors.white),
                onPressed: () => _handleSignOut(context),
              ),
            ],
          ),
          body: RefreshIndicator(
            color: const Color(0xFF1E3A8A),
            onRefresh: () async {
              context.read<DashboardBloc>().add(DashboardFetchData());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (isLoading && leaveBalance == null)
                    const LinearProgressIndicator(
                      minHeight: 2.5,
                      color: Color(0xFF0D9488),
                      backgroundColor: Color(0xFF1E3A8A),
                    ),

                  // 1. Profile & Greeting Header Card
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xFF1E3A8A),
                          Color(0xFF1E40AF),
                        ],
                      ),
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 28,
                              backgroundColor: Colors.white.withValues(alpha: 0.2),
                              child: Text(
                                Formats.initials(account.name),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getGreeting(),
                                    style: const TextStyle(fontSize: 13, color: Colors.white70),
                                  ),
                                  Text(
                                    account.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: account.isHRGA
                                              ? const Color(0xFFF59E0B)
                                              : const Color(0xFF0D9488),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          account.roleName.toUpperCase(),
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          account.email,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontSize: 11, color: Colors.white60),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.calendar_today_rounded, size: 14, color: Colors.white70),
                                  const SizedBox(width: 6),
                                  Text(
                                    todayFormatted,
                                    style: const TextStyle(fontSize: 12, color: Colors.white),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'Aktif Bekerja',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF86EFAC), fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 2. Today's Attendance Quick Status Card
                        _buildTodayAttendanceCard(context, todayAttendance),
                        const SizedBox(height: 20),

                        // 3. Leave & Permit Balance Card
                        _buildLeaveQuotaCard(leaveBalance),
                        const SizedBox(height: 24),

                        // 4. Core Employee Services Menu
                        const Text(
                          'Layanan Karyawan',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 12),
                        GridView.count(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.35,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            _buildFeatureCard(
                              title: 'Presensi GPS',
                              subtitle: 'Masuk & Pulang Kantor',
                              icon: Icons.location_on_rounded,
                              color: const Color(0xFF2563EB),
                              bgColor: const Color(0xFFEFF6FF),
                              onTap: () => Navigators.push(const AttendanceView()),
                            ),
                            _buildFeatureCard(
                              title: 'Izin & Cuti',
                              subtitle: 'Pengajuan & Riwayat',
                              icon: Icons.event_note_rounded,
                              color: const Color(0xFF059669),
                              bgColor: const Color(0xFFECFDF5),
                              onTap: () => Navigators.push(const PermitListView()),
                            ),
                            _buildFeatureCard(
                              title: 'Buat Izin Baru',
                              subtitle: 'Form Pengajuan Sakit/Cuti',
                              icon: Icons.post_add_rounded,
                              color: const Color(0xFFD97706),
                              bgColor: const Color(0xFFFFFBEB),
                              onTap: () => Navigators.push(const PermitCreateView()),
                            ),
                            _buildFeatureCard(
                              title: 'Riwayat Bulanan',
                              subtitle: 'Daftar Jam Kerja',
                              icon: Icons.history_rounded,
                              color: const Color(0xFF7C3AED),
                              bgColor: const Color(0xFFF5F3FF),
                              onTap: () => Navigators.push(const AttendanceView()),
                            ),
                          ],
                        ),

                        // 5. HRGA & Administrative Section (Only if role is HRGA/Admin)
                        if (account.isHRGA) ...[
                          const SizedBox(height: 28),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'HRGA PANEL',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFD97706),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Administrasi & Validasi',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildHRGACard(
                            title: 'Approval Permohonan Cuti & Izin',
                            description:
                                'Verifikasi berkas cuti, sakit (dengan indikator foto bukti), dan perizinan staf.',
                            icon: Icons.fact_check_rounded,
                            color: const Color(0xFFD97706),
                            badgeText: 'Review',
                            onTap: () => Navigators.push(const HrgaPermitReviewView()),
                          ),
                          const SizedBox(height: 10),
                          _buildHRGACard(
                            title: 'Kelola Sub-Jenis Cuti & Izin',
                            description:
                                'Tambah atau hapus sub-kategori izin pada kategori Sakit, Izin, dan Cuti.',
                            icon: Icons.category_rounded,
                            color: const Color(0xFF0D9488),
                            badgeText: 'Master',
                            onTap: () => Navigators.push(const HrgaSubPermitsView()),
                          ),
                        ],

                        const SizedBox(height: 32),
                        const Center(
                          child: Text(
                            'PT Montana Global Investama ERP • v1.0.0',
                            style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTodayAttendanceCard(BuildContext context, Map<String, dynamic>? todayAttendance) {
    final checkIn = todayAttendance?['check_in']?.toString() ?? '--:--';
    final checkOut = todayAttendance?['check_out']?.toString() ?? '--:--';
    final hasCheckedIn = checkIn != '--:--' && checkIn.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.timer_outlined, color: Color(0xFF1E3A8A), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Status Kehadiran Hari Ini',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: hasCheckedIn ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  hasCheckedIn ? 'Sudah Masuk' : 'Belum Presensi',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: hasCheckedIn ? const Color(0xFF059669) : const Color(0xFFD97706),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Jam Masuk', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      const SizedBox(height: 4),
                      Text(
                        checkIn,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Jam Pulang', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      const SizedBox(height: 4),
                      Text(
                        checkOut,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 11),
              ),
              onPressed: () => Navigators.push(const AttendanceView()),
              icon: const Icon(Icons.touch_app_rounded, size: 18),
              label: Text(
                hasCheckedIn ? 'Presensi Pulang / Cek GPS' : 'Presensi Masuk Sekarang',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveQuotaCard(Map<String, dynamic>? leaveBalance) {
    final remaining = leaveBalance?['remaining_days'] ?? 12;
    final used = leaveBalance?['used_days'] ?? 0;
    final quota = leaveBalance?['quota_days'] ?? 12;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.pie_chart_rounded, color: Color(0xFF0D9488), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Saldo & Kuota Cuti Tahunan',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                  ),
                ],
              ),
              InkWell(
                onTap: () => Navigators.push(const PermitCreateView()),
                child: const Text(
                  '+ Ajukan',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _buildLeaveStatItem('Sisa Cuti', '$remaining', 'Hari', const Color(0xFF059669), const Color(0xFFECFDF5)),
              const SizedBox(width: 10),
              _buildLeaveStatItem('Terpakai', '$used', 'Hari', const Color(0xFFD97706), const Color(0xFFFFFBEB)),
              const SizedBox(width: 10),
              _buildLeaveStatItem('Total Kuota', '$quota', 'Hari', const Color(0xFF1E3A8A), const Color(0xFFEFF6FF)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveStatItem(String label, String value, String unit, Color color, Color bgColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
                ),
                const SizedBox(width: 3),
                Text(
                  unit,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color.withValues(alpha: 0.8)),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: color.withValues(alpha: 0.85), fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHRGACard({
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required String badgeText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.2)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          badgeText,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8), size: 20),
          ],
        ),
      ),
    );
  }
}
