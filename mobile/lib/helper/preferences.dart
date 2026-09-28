// ignore_for_file: always_declare_return_types, always_specify_types



import 'preferences_key.dart';

import 'base_preferences.dart';

class Preferences {
  static bool? getBool(PreferenceKey preferenceKey, [bool? defValue]) {
    return BasePreferences.getInstance().getBool(preferenceKey.name) ?? defValue;
  }

  static int? getInt(PreferenceKey preferenceKey, [int? defValue]) {
    return BasePreferences.getInstance().getInt(preferenceKey.name) ?? defValue;
  }

  static double? getDouble(
      PreferenceKey preferenceKey, [
        double? defValue,
      ]) {
    return BasePreferences.getInstance().getDouble(preferenceKey.name) ?? defValue;
  }

  static String? getString(
      PreferenceKey preferenceKey, [
        String? defValue,
      ]) {
    return BasePreferences.getInstance().getString(preferenceKey.name) ?? defValue;
  }

  static List<String>? getStrings(
      PreferenceKey preferenceKey, [
        List<String>? defValue,
      ]) {
    return BasePreferences.getInstance().getStrings(preferenceKey.name) ?? defValue;
  }

  static Future<void> setBool(PreferenceKey preferenceKey, bool? value) async {
    if (value != null) {
      await BasePreferences.getInstance().setBool(preferenceKey.name, value);
    }
  }

  static Future<void> setInt(PreferenceKey preferenceKey, int? value) async {
    if (value != null) {
      await BasePreferences.getInstance().setInt(preferenceKey.name, value);
    }
  }

  static Future<void> setDouble(
      PreferenceKey preferenceKey,
      double? value,
      ) async {
    if (value != null) {
      await BasePreferences.getInstance().setDouble(preferenceKey.name, value);
    }
  }

  static Future<void> setString(
      PreferenceKey preferenceKey,
      String? value,
      ) async {
    if (value != null) {
      await BasePreferences.getInstance().setString(preferenceKey.name, value);
    }
  }

  static Future<void> setStrings(
      PreferenceKey preferenceKey,
      List<String>? value,
      ) async {
    if (value != null) {
      await BasePreferences.getInstance().setStrings(preferenceKey.name, value);
    }
  }

  static Future<void> remove(PreferenceKey preferenceKey) async {
    await BasePreferences.getInstance().remove(preferenceKey.name);
  }

  static bool contain(PreferenceKey preferenceKey) {
    return BasePreferences.getInstance().contain(preferenceKey.name);
  }
}
