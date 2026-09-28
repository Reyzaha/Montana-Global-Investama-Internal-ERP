import 'package:flutter/material.dart';
import '../../api/api_manager.dart';

class HrgaSubPermitsView extends StatefulWidget {
  const HrgaSubPermitsView({super.key});

  @override
  State<HrgaSubPermitsView> createState() => _HrgaSubPermitsViewState();
}

class _HrgaSubPermitsViewState extends State<HrgaSubPermitsView> {
  List<dynamic> _subPermits = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSubPermits();
  }

  Future<void> _loadSubPermits() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiManager.getPermitSubTypes(status: 'all');
      if (res.data['success'] == true && res.data['data'] != null) {
        setState(() {
          _subPermits = res.data['data'];
        });
      }
    } catch (_) {}
    finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteSubPermit(dynamic item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Hapus "${item['name']}"?'),
        content: const Text('Sub-izin ini akan dihapus permanen atau dinonaktifkan jika sudah ada riwayat permit.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await ApiManager.manageSubType({'action': 'delete', 'id': item['id']});
      if (res.data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.data['message'] ?? 'Berhasil dihapus.')),
        );
        _loadSubPermits();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _openAddModal() async {
    final nameCtrl = TextEditingController();
    int catId = 1;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Tambah Sub-Jenis Izin', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                initialValue: catId,
                items: const [
                  DropdownMenuItem(value: 1, child: Text('Izin')),
                  DropdownMenuItem(value: 2, child: Text('Sakit')),
                  DropdownMenuItem(value: 3, child: Text('Cuti')),
                ],
                onChanged: (v) => catId = v ?? 1,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nama Sub-Jenis Izin', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty) return;
                  Navigator.pop(ctx);
                  await ApiManager.manageSubType({
                    'action': 'create',
                    'category_id': catId,
                    'name': nameCtrl.text.trim(),
                  });
                  _loadSubPermits();
                },
                child: const Text('Simpan'),
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
      appBar: AppBar(
        title: const Text('Kelola Sub-Jenis Izin'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _openAddModal,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _subPermits.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = _subPermits[index];
                return Card(
                  child: ListTile(
                    title: Text(item['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Kategori: ${item['category_name']}'),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _deleteSubPermit(item),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
