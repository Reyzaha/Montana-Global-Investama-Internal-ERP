import 'package:flutter/material.dart';
import '../../api/api_manager.dart';
import 'permit_create_view.dart';

class PermitListView extends StatefulWidget {
  const PermitListView({super.key});

  @override
  State<PermitListView> createState() => _PermitListViewState();
}

class _PermitListViewState extends State<PermitListView> {
  List<dynamic> _permits = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPermits();
  }

  Future<void> _loadPermits() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiManager.getPermits();
      if (res.data['success'] == true && res.data['data'] != null) {
        setState(() {
          _permits = res.data['data'];
        });
      }
    } catch (_) {}
    finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pengajuan Izin & Cuti')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const PermitCreateView()),
          );
          if (res == true) _loadPermits();
        },
        icon: const Icon(Icons.add),
        label: const Text('Ajukan Izin'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _permits.isEmpty
              ? const Center(child: Text('Belum ada riwayat perizinan.'))
              : RefreshIndicator(
                  onRefresh: _loadPermits,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _permits.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final p = _permits[index];
                      final hasPhoto = (p['has_attachment'] ?? 0) > 0;

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    p['permit_type_name'] ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  if (p['permit_sub_type_name'] != null) ...[
                                    const SizedBox(width: 6),
                                    Text('(${p['permit_sub_type_name']})', style: const TextStyle(color: Colors.blue, fontSize: 12)),
                                  ],
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(4)),
                                    child: Text(p['status'] ?? '', style: TextStyle(fontSize: 11, color: Colors.amber.shade900, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text('${p['start_date']} s/d ${p['end_date']}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                  const Spacer(),
                                  // Label Merah jika Tanpa Foto Bukti
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: hasPhoto ? Colors.green.shade50 : Colors.red.shade50,
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(color: hasPhoto ? Colors.green.shade200 : Colors.red.shade200),
                                    ),
                                    child: Text(
                                      hasPhoto ? 'Ada Bukti' : 'Tanpa Bukti Foto',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: hasPhoto ? Colors.green : Colors.red,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(p['description'] ?? '', style: const TextStyle(fontSize: 13)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
