// ignore_for_file: use_build_context_synchronously, cascade_invocations, always_specify_types, depend_on_referenced_packages, avoid_print

import "package:dio/dio.dart" as dio;
import "package:flutter/material.dart";
import "preferences.dart";
import "preferences_key.dart";
import "navigators.dart";
import "app_colors.dart";

import "../api/api_manager.dart";
import "../api/model/account.dart";
import "../shared.dart";
import "../module/sign_in/sign_in_view.dart";

class Generals {
  static Future<void> self() async {
    final dio.Response response = await ApiManager.account();

    if (response.statusCode == 200 && response.data != null) {
      Shared.ACCOUNT = Account.parse(response.data);
    }
  }

  static Future<void> signOut(BuildContext? context) async {
    try {
      await ApiManager.signOut();
    } catch (e) {
      debugPrint("Sign out error: $e");
    }

    if (Preferences.contain(PreferenceKey.SESSION_ID)) {
      await Preferences.remove(PreferenceKey.SESSION_ID);
    }
    await Preferences.remove(PreferenceKey.SELECTED_ROLE);

    Shared.ACCOUNT = null;

    Navigators.pushAndRemoveAll(const SignInView());
  }
}

class Home3DStyle {
  static Gradient surfaceGradient() => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      AppColors.surface(),
      AppColors.onSurface(),
    ],
  );

  static List<BoxShadow> shadow() => [
    BoxShadow(
      // ignore: deprecated_member_use
      color: Colors.black.withOpacity(0.45),
      blurRadius: 12,
      offset: const Offset(0, 6),
    ),
    BoxShadow(
      // ignore: deprecated_member_use
      color: Colors.white.withOpacity(0.20),
      blurRadius: 4,
      offset: const Offset(-2, -2),
    ),
  ];
}
