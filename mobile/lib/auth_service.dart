import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api/api_manager.dart';
import 'api/endpoint/sign_in/sign_in_request.dart';
import 'api/model/account.dart';

class AuthService {
  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  static const String _userKey = 'current_user_account';
  static Account? currentUser;

  static Future<bool> signIn(String email, String password) async {
    try {
      final req = SignInRequest(email: email, password: password);
      final res = await ApiManager.signIn(signInRequest: req);

      if (res.data != null && res.data['success'] == true) {
        // Fetch current account detail
        final accountRes = await ApiManager.account();
        if (accountRes.data != null && accountRes.data['data'] != null) {
          currentUser = Account.fromJson(accountRes.data['data']);
          await _storage.write(key: _userKey, value: jsonEncode(currentUser!.toJson()));
          return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<Account?> getSavedAccount() async {
    try {
      final raw = await _storage.read(key: _userKey);
      if (raw != null) {
        currentUser = Account.fromJson(jsonDecode(raw));
        return currentUser;
      }
    } catch (_) {}
    return null;
  }

  static Future<void> signOut() async {
    try {
      await ApiManager.signOut();
    } catch (_) {}
    currentUser = null;
    await _storage.delete(key: _userKey);
  }
}
