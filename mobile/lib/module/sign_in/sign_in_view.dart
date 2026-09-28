import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api/api_manager.dart';
import '../../api/endpoint/sign_in/sign_in_request.dart';
import '../../constant.dart';
import '../../helper/dialogs.dart';
import '../../helper/dimensions.dart';
import '../../helper/navigators.dart';
import '../../helper/preferences.dart';
import '../../helper/preferences_key.dart';
import '../../overlay/base_overlays.dart';
import '../../shared.dart';
import '../dashboard/dashboard_view.dart';
import 'sign_in_bloc.dart';
import 'sign_in_event.dart';
import 'sign_in_state.dart';

class SignInView extends StatelessWidget {
  const SignInView({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<SignInBloc>(
      create: (_) => SignInBloc(),
      child: const _SignInForm(),
    );
  }
}

class _SignInForm extends StatefulWidget {
  const _SignInForm();

  @override
  State<_SignInForm> createState() => _SignInFormState();
}

class _SignInFormState extends State<_SignInForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    _loadSavedPreferences();
  }

  void _loadSavedPreferences() {
    final remember = Preferences.getBool(PreferenceKey.REMEMBER_ME) ?? false;
    final savedEmail = Preferences.getString(PreferenceKey.SAVED_EMAIL) ?? '';

    setState(() {
      _rememberMe = remember;
      if (remember && savedEmail.isNotEmpty) {
        _emailController.text = savedEmail;
      } else if (_emailController.text.isEmpty) {
        _emailController.text = 'montanaglobalinvestamait@gmail.com';
        _passwordController.text = 'admin123321mgi';
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleSubmit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    context.read<SignInBloc>().add(
      SignInSubmit(
        signInRequest: SignInRequest(email: email, password: password),
      ),
    );
  }

  void _showForgotPasswordDialog() {
    Dialogs.message(
      buildContext: context,
      title: 'Lupa Kata Sandi?',
      message:
          'Silakan hubungi administrator IT atau HRGA PT Montana Global Investama untuk reset kata sandi akun ERP Anda.',
      dismiss: 'Mengerti',
    );
  }

  void _showServerSwitcherDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Konfigurasi Server API',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Pilih host server ERP yang aktif untuk jaringan kantor / pengujian:',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  Icons.dns_rounded,
                  color: ApiManager.PRIMARY ? const Color(0xFF1E3A8A) : Colors.grey,
                ),
                title: const Text('Server Utama (Emulator / Localhost)'),
                subtitle: const Text(ApiUrl.MAIN_BASE),
                trailing: ApiManager.PRIMARY
                    ? const Icon(Icons.check_circle, color: Color(0xFF1E3A8A))
                    : null,
                onTap: () {
                  setState(() => ApiManager.PRIMARY = true);
                  Navigator.pop(ctx);
                },
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  Icons.wifi_tethering_rounded,
                  color: !ApiManager.PRIMARY ? const Color(0xFF0D9488) : Colors.grey,
                ),
                title: const Text('Server Sekunder (LAN Office / WiFi)'),
                subtitle: const Text(ApiUrl.SECONDARY_BASE),
                trailing: !ApiManager.PRIMARY
                    ? const Icon(Icons.check_circle, color: Color(0xFF0D9488))
                    : null,
                onTap: () {
                  setState(() => ApiManager.PRIMARY = false);
                  Navigator.pop(ctx);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SignInBloc, SignInState>(
      listener: (context, state) async {
        if (state is SignInSubmitSuccess) {
          // Simpan preferensi Ingat Saya
          await Preferences.setBool(PreferenceKey.REMEMBER_ME, _rememberMe);
          if (_rememberMe) {
            await Preferences.setString(PreferenceKey.SAVED_EMAIL, _emailController.text.trim());
          } else {
            await Preferences.remove(PreferenceKey.SAVED_EMAIL);
          }

          BaseOverlays.success(
            title: 'Selamat Datang',
            message: 'Halo, ${Shared.ACCOUNT?.name ?? "Karyawan"}! Berhasil masuk ke MGI ERP.',
          );

          if (!mounted) return;
          Navigators.pushReplacement(DashboardView(account: Shared.ACCOUNT!));
        }
      },
      builder: (context, state) {
        final isLoading = state is SignInSubmitLoading;

        return Scaffold(
          backgroundColor: const Color(0xFFF1F5F9),
          body: Stack(
            children: [
              // Background Header Gradient
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: Dimensions.screenHeight * 0.40,
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF0F172A),
                        Color(0xFF1E3A8A),
                        Color(0xFF1E40AF),
                      ],
                    ),
                  ),
                  child: Stack(
                    children: [
                      Positioned(
                        top: -40,
                        right: -40,
                        child: Container(
                          width: 180,
                          height: 180,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.06),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 20,
                        left: -30,
                        child: Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF0D9488).withValues(alpha: 0.15),
                          ),
                        ),
                      ),
                      SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.white.withValues(alpha: 0.25),
                                      ),
                                    ),
                                    child: const Icon(
                                      Icons.corporate_fare_rounded,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'PT MONTANA GLOBAL INVESTAMA',
                                          style: TextStyle(
                                            color: Colors.white70,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                        Text(
                                          'MGI ERP Mobile',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              const Text(
                                'Selamat Datang Kembali',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Silakan masuk ke akun kerja Anda untuk presensi dan layanan mandiri.',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Form Container Card
              Positioned.fill(
                top: Dimensions.screenHeight * 0.34,
                child: Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 15,
                        offset: Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Email Perusahaan',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            enabled: !isLoading,
                            decoration: InputDecoration(
                              hintText: 'nama@montana.co.id',
                              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                              prefixIcon: const Icon(Icons.alternate_email_rounded, color: Color(0xFF64748B)),
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(vertical: 16),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF1E3A8A), width: 1.8),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Email perusahaan wajib diisi';
                              }
                              if (!val.contains('@')) {
                                return 'Format email tidak valid';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 18),

                          const Text(
                            'Kata Sandi',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            textInputAction: TextInputAction.done,
                            enabled: !isLoading,
                            onFieldSubmitted: (_) => _handleSubmit(context),
                            decoration: InputDecoration(
                              hintText: 'Masukkan kata sandi',
                              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                              prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFF64748B)),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                  color: const Color(0xFF64748B),
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(vertical: 16),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF1E3A8A), width: 1.8),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) {
                                return 'Kata sandi wajib diisi';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  SizedBox(
                                    height: 24,
                                    width: 24,
                                    child: Checkbox(
                                      value: _rememberMe,
                                      activeColor: const Color(0xFF1E3A8A),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      onChanged: isLoading
                                          ? null
                                          : (val) => setState(() => _rememberMe = val ?? false),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  GestureDetector(
                                    onTap: isLoading
                                        ? null
                                        : () => setState(() => _rememberMe = !_rememberMe),
                                    child: const Text(
                                      'Ingat Saya',
                                      style: TextStyle(fontSize: 13, color: Color(0xFF475569)),
                                    ),
                                  ),
                                ],
                              ),
                              TextButton(
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: _showForgotPasswordDialog,
                                child: const Text(
                                  'Lupa Sandi?',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1E3A8A),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 28),

                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1E3A8A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              elevation: 2,
                              shadowColor: const Color(0xFF1E3A8A).withValues(alpha: 0.4),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            onPressed: isLoading ? null : () => _handleSubmit(context),
                            child: isLoading
                                ? const SizedBox(
                                    height: 22,
                                    width: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Masuk ke Sistem',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                      SizedBox(width: 8),
                                      Icon(Icons.arrow_forward_rounded, size: 20),
                                    ],
                                  ),
                          ),
                          const SizedBox(height: 32),

                          Center(
                            child: InkWell(
                              onTap: _showServerSwitcherDialog,
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE2E8F0),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.dns_rounded,
                                      size: 14,
                                      color: ApiManager.PRIMARY
                                          ? const Color(0xFF1E3A8A)
                                          : const Color(0xFF0D9488),
                                    ),
                                    const SizedBox(width: 6),
                                      Text(
                                        ApiManager.PRIMARY
                                            ? 'Server: Utama (192.168.110.181)'
                                            : 'Server: Emulator (10.0.2.2)',
                                        style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF334155),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.swap_horiz_rounded, size: 14, color: Color(0xFF64748B)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            '© 2026 PT Montana Global Investama\nAll rights reserved.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
