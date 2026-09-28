import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../api/api_manager.dart';

class PermitCreateView extends StatefulWidget {
  const PermitCreateView({super.key});

  @override
  State<PermitCreateView> createState() => _PermitCreateViewState();
}

class _PermitCreateViewState extends State<PermitCreateView> {
  List<dynamic> _categories = [];
  List<dynamic> _subCategories = [];

  dynamic _selectedCategory;
  dynamic _selectedSubType;

  DateTime? _startDate;
  DateTime? _endDate;
  final _descriptionController = TextEditingController();
  File? _attachmentFile;

  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiManager.getPermitTypes();
      if (res.data['success'] == true) {
        setState(() {
          // Hanya 3 kategori unik: Izin, Sakit, Cuti
          _categories = res.data['data'] ?? [];
        });
      }
    } catch (_) {}
    finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _onCategoryChanged(dynamic cat) async {
    setState(() {
      _selectedCategory = cat;
      _selectedSubType = null;
      _subCategories = [];
    });

    if (cat == null) return;

    try {
      final res = await ApiManager.getPermitSubTypes(categoryId: int.parse(cat['id'].toString()));
      if (res.data['success'] == true) {
        setState(() {
          _subCategories = res.data['data'] ?? [];
        });
      }
    } catch (_) {}
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 75);
    if (picked != null) {
      setState(() => _attachmentFile = File(picked.path));
    }
  }

  Future<void> _submitPermit() async {
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih kategori utama')));
      return;
    }
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih rentang tanggal')));
      return;
    }
    if (_descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Alasan wajib diisi')));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final map = <String, dynamic>{
        'permit_type_id': _selectedCategory['id'],
        'start_date': _startDate!.toIso8601String().substring(0, 10),
        'end_date': _endDate!.toIso8601String().substring(0, 10),
        'description': _descriptionController.text.trim(),
      };

      if (_selectedSubType != null) {
        map['permit_sub_type_id'] = _selectedSubType['id'];
      }

      if (_attachmentFile != null) {
        map['attachment'] = await MultipartFile.fromFile(
          _attachmentFile!.path,
          filename: _attachmentFile!.path.split('/').last,
        );
      }

      final formData = FormData.fromMap(map);
      final res = await ApiManager.submitPermit(formData);

      if (res.data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pengajuan izin berhasil dikirim.')),
        );
        Navigator.pop(context, true);
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
      appBar: AppBar(title: const Text('Buat Pengajuan Izin')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Kategori Izin Utama *', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<dynamic>(
                    initialValue: _selectedCategory,
                    hint: const Text('-- Pilih Kategori Utama --'),
                    items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c['name'] ?? ''))).toList(),
                    onChanged: _onCategoryChanged,
                  ),
                  const SizedBox(height: 16),

                  const Text('Sub-Jenis Izin', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<dynamic>(
                    initialValue: _selectedSubType,
                    hint: Text(_selectedCategory == null ? '-- Pilih Kategori Utama Dahulu --' : '-- Pilih Sub-Jenis Izin --'),
                    items: _subCategories.map((s) => DropdownMenuItem(value: s, child: Text(s['name'] ?? ''))).toList(),
                    onChanged: _subCategories.isEmpty ? null : (v) => setState(() => _selectedSubType = v),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now(),
                              firstDate: DateTime(2025),
                              lastDate: DateTime(2030),
                            );
                            if (d != null) setState(() => _startDate = d);
                          },
                          child: Text(_startDate == null ? 'Mulai' : _startDate!.toIso8601String().substring(0, 10)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: _startDate ?? DateTime.now(),
                              firstDate: _startDate ?? DateTime(2025),
                              lastDate: DateTime(2030),
                            );
                            if (d != null) setState(() => _endDate = d);
                          },
                          child: Text(_endDate == null ? 'Selesai' : _endDate!.toIso8601String().substring(0, 10)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  const Text('Alasan / Keterangan *', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 3,
                    decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'Jelaskan alasan pengajuan...'),
                  ),
                  const SizedBox(height: 16),

                  const Text('Lampiran Foto Bukti (Opsional)', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  OutlinedButton.icon(
                    onPressed: _pickImage,
                    icon: const Icon(Icons.camera_alt),
                    label: Text(_attachmentFile == null ? 'Unggah Foto Bukti' : 'Foto: ${_attachmentFile!.path.split('/').last}'),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '* Catatan: Jika tidak menyertakan foto, sistem HRGA akan menandai dengan label merah "Tanpa Bukti Foto".',
                    style: TextStyle(fontSize: 12, color: Colors.red, fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: _isSubmitting ? null : _submitPermit,
                    child: _isSubmitting ? const CircularProgressIndicator(color: Colors.white) : const Text('Kirim Pengajuan'),
                  ),
                ],
              ),
            ),
    );
  }
}
