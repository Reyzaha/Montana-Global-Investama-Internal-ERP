// ignore_for_file: always_declare_return_types, always_specify_types

import "package:shared_preferences/shared_preferences.dart";

class BasePreferences {
  static BasePreferences? _instance;

  BasePreferences._internal();

  static BasePreferences getInstance() {
    _instance ??= BasePreferences._internal();

    return _instance!;
  }

  late SharedPreferences sharedPreferences;

  Future<void> init() async {
    sharedPreferences = await SharedPreferences.getInstance();
  }

  bool? getBool(String key, [bool? defValue]) {
    return sharedPreferences.getBool(key) ?? defValue;
  }

  int? getInt(String key, [int? defValue]) {
    return sharedPreferences.getInt(key) ?? defValue;
  }

  double? getDouble(
      String key, [
        double? defValue,
      ]) {
    return sharedPreferences.getDouble(key) ?? defValue;
  }

  String? getString(
      String key, [
        String? defValue,
      ]) {
    return sharedPreferences.getString(key) ?? defValue;
  }

  List<String>? getStrings(
      String key, [
        List<String>? defValue,
      ]) {
    return sharedPreferences.getStringList(key) ?? defValue;
  }

  Future<void> setBool(String key, bool? value) async {
    if (value != null) {
      await sharedPreferences.setBool(key, value);
    }
  }

  Future<void> setInt(String key, int? value) async {
    if (value != null) {
      await sharedPreferences.setInt(key, value);
    }
  }

  Future<void> setDouble(String key, double? value) async {
    if (value != null) {
      await sharedPreferences.setDouble(key, value);
    }
  }

  Future<void> setString(String key, String? value) async {
    if (value != null) {
      await sharedPreferences.setString(key, value);
    }
  }

  Future<void> setStrings(
      String key,
      List<String>? value,
      ) async {
    if (value != null) {
      await sharedPreferences.setStringList(key, value);
    }
  }

  Future<void> remove(String key) async {
    await sharedPreferences.remove(key);
  }

  bool contain(String key) {
    return sharedPreferences.containsKey(key);
  }

  Future<void> clear() async {
    await sharedPreferences.clear();
  }

  Future<void> reload() async {
    await sharedPreferences.reload();
  }

  Map<String, String> all() {
    final values = <String, String>{};

    for (String key in sharedPreferences.getKeys()) {
      Object? object = sharedPreferences.get(key);

      if (object != null) {
        values[key] = object.toString();
      }
    }

    return values;
  }
}
