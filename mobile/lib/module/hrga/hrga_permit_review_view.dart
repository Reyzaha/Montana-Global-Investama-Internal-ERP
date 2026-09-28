import 'package:flutter/material.dart';
import '../../api/api_manager.dart';

class HrgaPermitReviewView extends StatefulWidget {
  const HrgaPermitReviewView({super.key});

  @override
  State<HrgaPermitReviewView> createState() => _HrgaPermitReviewViewState();
}

class _HrgaPermitReviewViewState extends State<HrgaPermitReviewView> {
  List<dynamic> _permits = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPendingPermits();
  }

  Future<void> _loadPendingPermits() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiManager.getPermits(status: 'pending_hrga');
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

  Future<void> _showDetailModal(dynamic p) async {
    final noteController = TextEditingController();
    final bool hasPhoto = (p['has_attachment'] ?? 0) > 0;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Review Permit #${p['id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 10),
              Text('Karyawan: ${p['employee_email']}'),
              Text('Jenis: ${p['permit_type_name']}'),
              Text('Periode: ${p['start_date']} s/d ${p['end_date']}'),
              const SizedBox(height: 12),

              // Peringatan Merah jika tidak ada foto
              if (!hasPhoto)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.red),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Catatan: Pemohon TIDAK mengunggah foto / bukti surat pendukung.',
                          style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green),
                      SizedBox(width: 8),
                      Text('Pemohon melampirkan berkas foto bukti.'),
                    ],
                  ),
                ),
              const SizedBox(height: 12),

              Text('Alasan: ${p['description']}'),
              const SizedBox(height: 12),

              TextField(
                controller: noteController,
                decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'Catatan keputusan...'),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await ApiManager.rejectPermit(id: p['id'], note: noteController.text);
                        _loadPendingPermits();
                      },
                      child: const Text('Tolak'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await ApiManager.approvePermit(id: p['id'], note: noteController.text);
                        _loadPendingPermits();
                      },
                      child: const Text('Setujui'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Review Permit HRGA')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _permits.isEmpty
              ? const Center(child: Text('Tidak ada permit pending.'))
              : RefreshIndicator(
                  onRefresh: _loadPendingPermits,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _permits.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final p = _permits[index];
                      final hasPhoto = (p['has_attachment'] ?? 0) > 0;

                      return Card(
                        child: ListTile(
                          title: Row(
                            children: [
                              Text(p['permit_type_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                              const SizedBox(width: 8),
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
                          subtitle: Text('${p['employee_email']}\n${p['start_date']} s/d ${p['end_date']}'),
                          trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                          onTap: () => _showDetailModal(p),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
