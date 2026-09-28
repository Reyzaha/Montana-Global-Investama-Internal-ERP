import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../api/api_manager.dart';

class AttendanceView extends StatefulWidget {
  const AttendanceView({super.key});

  @override
  State<AttendanceView> createState() => _AttendanceViewState();
}

class _AttendanceViewState extends State<AttendanceView> {
  bool _isLoading = true;
  bool _isSubmitting = false;
  Position? _currentPosition;
  double _officeLat = -6.2088;
  double _officeLng = 106.8456;
  double _radiusMeters = 100;
  double? _distance;

  @override
  void initState() {
    super.initState();
    _loadSettingsAndLocation();
  }

  Future<void> _loadSettingsAndLocation() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiManager.getAttendanceSettings();
      if (res.data['success'] == true && res.data['data'] != null) {
        final d = res.data['data'];
        _officeLat = double.parse((d['office_latitude'] ?? -6.2088).toString());
        _officeLng = double.parse((d['office_longitude'] ?? 106.8456).toString());
        _radiusMeters = double.parse((d['radius_meters'] ?? 100).toString());
      }
      await _checkLocation();
    } catch (_) {}
    finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _checkLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (pos.isMocked) {
        throw Exception('Terdeteksi Lokasi Palsu (Fake GPS).');
      }
      final dist = Geolocator.distanceBetween(pos.latitude, pos.longitude, _officeLat, _officeLng);
      setState(() {
        _currentPosition = pos;
        _distance = dist;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lokasi error: $e')));
      }
    }
  }

  bool get _isInside => _distance != null && _distance! <= _radiusMeters;

  Future<void> _doAttendance(bool isCheckIn) async {
    if (_currentPosition == null) await _checkLocation();
    if (_currentPosition == null) return;

    setState(() => _isSubmitting = true);
    try {
      final res = isCheckIn
          ? await ApiManager.checkIn(lat: _currentPosition!.latitude, lng: _currentPosition!.longitude, notes: 'Mobile App')
          : await ApiManager.checkOut(lat: _currentPosition!.latitude, lng: _currentPosition!.longitude, notes: 'Mobile App');

      if (res.data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.data['message'] ?? 'Presensi berhasil dicatat.')),
        );
      } else {
        throw Exception(res.data['message']);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Presensi GPS')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    color: _isInside ? Colors.green.shade50 : Colors.red.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        children: [
                          Icon(_isInside ? Icons.check_circle : Icons.fmd_bad, color: _isInside ? Colors.green : Colors.red, size: 48),
                          const SizedBox(height: 8),
                          Text(
                            _isInside ? 'Dalam Radius Kantor' : 'Di Luar Radius Kantor',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _isInside ? Colors.green : Colors.red),
                          ),
                          Text(
                            _distance != null ? 'Jarak: ${_distance!.toStringAsFixed(1)} m (Maks: ${_radiusMeters.toStringAsFixed(0)} m)' : 'Menghitung...',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
                    onPressed: _isSubmitting || !_isInside ? null : () => _doAttendance(true),
                    icon: const Icon(Icons.login),
                    label: const Text('Check-In Masuk'),
                  ),
                  const SizedBox(height: 12),

                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
                    onPressed: _isSubmitting || !_isInside ? null : () => _doAttendance(false),
                    icon: const Icon(Icons.logout),
                    label: const Text('Check-Out Pulang'),
                  ),
                ],
              ),
            ),
    );
  }
}
