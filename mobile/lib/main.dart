import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'constant.dart';
import 'helper/base_preferences.dart';
import 'shared.dart';
import 'module/sign_in/sign_in_view.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inisialisasi BasePreferences
  await BasePreferences.getInstance().init();
  
  runApp(const MgiErpApp());
}

class MgiErpApp extends StatelessWidget {
  const MgiErpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: AppConstants.appName,
      navigatorKey: Shared.navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E3A8A),
          primary: const Color(0xFF1E3A8A),
          secondary: const Color(0xFF0D9488),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
          backgroundColor: Color(0xFF1E3A8A),
          foregroundColor: Colors.white,
        ),
      ),
      home: const SignInView(),
    );
  }
}
